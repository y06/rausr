#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class Cue:
    index: int
    time_range: str
    lines: Tuple[str, ...]


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def parse_srt(text: str) -> List[Cue]:
    text = _normalize_newlines(text).strip("\n")
    if not text:
        return []

    blocks = [b for b in text.split("\n\n") if b.strip()]
    cues: List[Cue] = []
    for block in blocks:
        lines = [ln.rstrip("\n") for ln in block.split("\n")]
        if len(lines) < 2:
            continue

        try:
            index = int(lines[0].strip())
        except ValueError:
            continue

        time_range = lines[1].strip()
        body = tuple(lines[2:]) if len(lines) > 2 else tuple()
        cues.append(Cue(index=index, time_range=time_range, lines=body))

    return cues


def format_cue(index: int, time_range: str, lines: Sequence[str]) -> str:
    out = [str(index), time_range, *lines, ""]
    return "\n".join(out)


def chunked(seq: Sequence[Cue], size: int) -> Iterable[List[Cue]]:
    for i in range(0, len(seq), size):
        yield list(seq[i : i + size])


SYSTEM_PROMPT = """You are a professional subtitle translator.
Translate subtitles from English to Slovak with natural cinematic flow.
Keep slang and strong profanity strong (do not sanitize).
Preserve meaning, tone, and character voice.

Strict formatting rules:
- Do NOT change cue numbers in [brackets].
- Do NOT add or remove cues.
- Output ONLY the translated cues in the exact same bracketed format.
- Keep punctuation, ellipses, and dashes for dialogue where natural.
- Preserve any markup/tags (e.g., <i>...</i>) exactly.
- Keep proper names as names (do not translate names).
"""


def build_user_prompt(cues: Sequence[Cue]) -> str:
    parts: List[str] = []
    parts.append(
        "Translate each cue. Keep each cue's number in brackets, and output the translated text lines under it.\n"
        "Format:\n"
        "[123]\n"
        "translated line 1\n"
        "translated line 2\n"
        "\n"
        "Cues:\n"
    )

    for cue in cues:
        parts.append(f"[{cue.index}]")
        parts.extend(cue.lines if cue.lines else ("",))
        parts.append("")  # blank line between cues

    return "\n".join(parts).rstrip() + "\n"


_CUE_RE = re.compile(r"^\[(\d+)\]\s*$")


def parse_translated_cues(text: str) -> List[Tuple[int, List[str]]]:
    text = _normalize_newlines(text).strip("\n")
    lines = text.split("\n") if text else []

    out: List[Tuple[int, List[str]]] = []
    current_index: int | None = None
    current_lines: List[str] = []

    def flush() -> None:
        nonlocal current_index, current_lines
        if current_index is None:
            return
        # Trim trailing blank lines inside a cue, but keep intentional empty lines if present.
        while current_lines and current_lines[-1] == "":
            current_lines.pop()
        out.append((current_index, current_lines))
        current_index = None
        current_lines = []

    for ln in lines:
        m = _CUE_RE.match(ln.strip())
        if m:
            flush()
            current_index = int(m.group(1))
            continue
        if current_index is None:
            continue
        current_lines.append(ln)

    flush()
    return out


def call_openai_chat_completions(
    *,
    api_key: str,
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    timeout_s: int,
    max_retries: int,
    retry_sleep_s: float,
) -> str:
    url = base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_err: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            req = Request(url, data=data, headers=headers, method="POST")
            with urlopen(req, timeout=timeout_s) as resp:
                body = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            return parsed["choices"][0]["message"]["content"]
        except HTTPError as e:
            last_err = e
            code = getattr(e, "code", None)
            if code in (429, 500, 502, 503, 504) and attempt < max_retries:
                time.sleep(retry_sleep_s * attempt)
                continue
            raise
        except (URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError) as e:
            last_err = e
            if attempt < max_retries:
                time.sleep(retry_sleep_s * attempt)
                continue
            raise

    assert last_err is not None
    raise last_err


def main(argv: Sequence[str]) -> int:
    ap = argparse.ArgumentParser(description="Translate an .srt subtitle file to Slovak using an LLM API.")
    ap.add_argument("input", help="Path to input .srt (English)")
    ap.add_argument(
        "-o",
        "--output",
        help="Path to output .srt (Slovak). Default: <input>.sk.srt",
        default=None,
    )
    ap.add_argument("--start", type=int, default=1, help="Start cue index (inclusive)")
    ap.add_argument("--end", type=int, default=0, help="End cue index (inclusive). 0 = to end")
    ap.add_argument("--chunk-cues", type=int, default=50, help="Cues per API request")
    ap.add_argument("--resume", action="store_true", help="If output exists, continue after last cue found")
    ap.add_argument(
        "--model",
        default=os.getenv("OPENAI_MODEL", "gpt-5.2"),
        help="Model name (e.g. gpt-5.2). Shorthand '5.2' is also accepted.",
    )
    ap.add_argument("--base-url", default=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    ap.add_argument("--temperature", type=float, default=0.2)
    ap.add_argument("--timeout-s", type=int, default=120)
    ap.add_argument("--max-retries", type=int, default=5)
    ap.add_argument("--retry-sleep-s", type=float, default=1.5)
    ap.add_argument("--dry-run", action="store_true", help="Parse input and print cue counts only")

    args = ap.parse_args(list(argv))

    if args.model.strip() == "5.2":
        args.model = "gpt-5.2"

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not args.dry_run and not api_key:
        print("Missing OPENAI_API_KEY environment variable.", file=sys.stderr)
        return 2

    with open(args.input, "r", encoding="utf-8", errors="replace") as f:
        cues = parse_srt(f.read())

    if not cues:
        print("No cues found in input.", file=sys.stderr)
        return 2

    cue_by_index = {c.index: c for c in cues}
    all_indices = sorted(cue_by_index.keys())
    min_idx = all_indices[0]
    max_idx = all_indices[-1]

    start = max(args.start, min_idx)
    end = max_idx if args.end == 0 else min(args.end, max_idx)
    if start > end:
        print(f"Invalid range: start={start} end={end}", file=sys.stderr)
        return 2

    output_path = args.output
    if output_path is None:
        output_path = args.input
        if output_path.lower().endswith(".srt"):
            output_path = output_path[:-4] + ".sk.srt"
        else:
            output_path = output_path + ".sk.srt"

    existing_done = 0
    if args.resume and os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8", errors="replace") as f:
                existing = parse_srt(f.read())
            if existing:
                existing_done = max(c.index for c in existing)
        except OSError:
            existing_done = 0

    effective_start = max(start, existing_done + 1) if args.resume else start

    if args.dry_run:
        print(f"input cues: {len(cues)} (min={min_idx} max={max_idx})")
        print(f"range: {start}..{end}")
        if args.resume:
            print(f"resume: last_done={existing_done} effective_start={effective_start}")
        print(f"output: {output_path}")
        return 0

    # Build ordered list of cues for the selected range.
    selected: List[Cue] = []
    for idx in all_indices:
        if idx < effective_start or idx > end:
            continue
        selected.append(cue_by_index[idx])

    if not selected:
        print("Nothing to translate (already complete for this range).")
        return 0

    # Append mode if resuming; otherwise overwrite.
    out_mode = "a" if (args.resume and os.path.exists(output_path)) else "w"
    with open(output_path, out_mode, encoding="utf-8", newline="\n") as out_f:
        for chunk in chunked(selected, max(1, args.chunk_cues)):
            user_prompt = build_user_prompt(chunk)
            translated_text = call_openai_chat_completions(
                api_key=api_key,
                base_url=args.base_url,
                model=args.model,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=args.temperature,
                timeout_s=args.timeout_s,
                max_retries=args.max_retries,
                retry_sleep_s=args.retry_sleep_s,
            )

            translated = parse_translated_cues(translated_text)
            translated_map = {idx: lines for idx, lines in translated}

            for cue in chunk:
                lines = translated_map.get(cue.index)
                if lines is None:
                    raise RuntimeError(
                        f"Model output missing cue [{cue.index}]. "
                        f"Try smaller --chunk-cues or lower --temperature."
                    )
                out_f.write(format_cue(cue.index, cue.time_range, lines))
            out_f.flush()

    print(f"Wrote: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

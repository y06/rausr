#!/usr/bin/env python3
"""Render Hugo articles and publish them through Medium's legacy API."""

from __future__ import annotations

import argparse
import html
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BLOGGER_ADAPTER = Path(__file__).resolve().parents[1] / "blogger"
sys.path.insert(0, str(BLOGGER_ADAPTER))

from publish_hugo_to_blogger import (  # noqa: E402
    DEFAULT_SYNDICATION_RATIO,
    PublisherError,
    absolute_url,
    absolutize_html_urls,
    discover_markdown,
    find_site_root,
    render_with_hugo,
    save_private_json,
    string_list,
    syndicated_content,
)


MEDIUM_API = "https://api.medium.com/v1"


@dataclass(frozen=True)
class MediumArticle:
    source: Path
    key: str
    title: str
    content: str
    tags: list[str]
    canonical_url: str
    publish_status: str


def default_config_path(filename: str) -> Path:
    root = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return root / "hugo-medium" / filename


def default_state_path() -> Path:
    root = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state"))
    return root / "hugo-medium" / "state.json"


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "targets": {}, "activity": []}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PublisherError(f"Could not read Medium state file {path}: {exc}") from exc
    if not isinstance(state, dict) or state.get("version") != 1:
        raise PublisherError(f"Unsupported Medium state file format: {path}")
    state.setdefault("targets", {})
    state.setdefault("activity", [])
    return state


def read_token(path: Path) -> str:
    try:
        token = path.expanduser().read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise PublisherError(f"Could not read Medium integration token: {exc}") from exc
    if not token:
        raise PublisherError("The Medium integration token is empty.")
    return token


class MediumClient:
    def __init__(self, token: str):
        self.token = token

    def request(self, method: str, path: str, body: dict[str, Any] | None = None) -> Any:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(
            f"{MEDIUM_API}{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8",
            },
        )
        try:
            with urlopen(request, timeout=60) as response:
                decoded = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:1000]
            raise PublisherError(f"Medium API {method} {path} failed ({exc.code}): {detail}") from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise PublisherError(f"Medium API request failed: {exc}") from exc
        return decoded.get("data", decoded) if isinstance(decoded, dict) else decoded

    def me(self) -> dict[str, Any]:
        data = self.request("GET", "/me")
        return data if isinstance(data, dict) else {}

    def publications(self, user_id: str) -> list[dict[str, Any]]:
        data = self.request("GET", f"/users/{user_id}/publications")
        return [item for item in data if isinstance(item, dict)] if isinstance(data, list) else []

    def create_post(self, target_type: str, target_id: str, body: dict[str, Any]) -> dict[str, Any]:
        if target_type == "publication":
            data = self.request("POST", f"/publications/{target_id}/posts", body)
        else:
            data = self.request("POST", f"/users/{target_id}/posts", body)
        return data if isinstance(data, dict) else {}


def make_article(
    source: Path,
    site_root: Path,
    payload: dict[str, Any],
    mode: str,
    asset_base_url: str | None,
    include_header_image: bool,
    content_ratio: float = DEFAULT_SYNDICATION_RATIO,
) -> MediumArticle:
    base_url = asset_base_url or str(payload.get("baseURL") or "")
    canonical_url = absolute_url(str(payload.get("permalink") or ""), base_url)
    if not canonical_url:
        raise PublisherError(f"Hugo did not produce a permalink for {source}")

    title = str(payload["title"])
    body = absolutize_html_urls(str(payload["content"]), base_url)
    body = syndicated_content(body, canonical_url, title, content_ratio)
    content = f"<h1>{html.escape(title)}</h1>\n{body}"
    header_image = str(payload.get("headerImage") or "")
    if include_header_image and header_image:
        image_url = absolute_url(header_image, base_url)
        content = (
            f'<h1>{html.escape(title)}</h1>\n'
            f'<p><img src="{html.escape(image_url, quote=True)}" alt="{html.escape(title, quote=True)}"></p>\n'
            f'{body}'
        )

    tags = list(dict.fromkeys(string_list(payload.get("tags")) + string_list(payload.get("categories"))))
    tags = [tag for tag in tags if len(tag) <= 25][:3]
    is_draft = mode == "draft" or (mode == "frontmatter" and bool(payload.get("draft", False)))
    return MediumArticle(
        source=source,
        key=source.relative_to(site_root).as_posix(),
        title=title,
        content=content,
        tags=tags,
        canonical_url=canonical_url,
        publish_status="draft" if is_draft else "public",
    )


def record_activity(
    state: dict[str, Any],
    article: MediumArticle,
    action: str,
    status: str,
    url: str | None = None,
    detail: str = "",
) -> None:
    activity = state.setdefault("activity", [])
    activity.insert(0, {
        "provider": "medium",
        "title": article.title,
        "source": article.key,
        "action": action,
        "status": status.upper(),
        "url": url,
        "detail": detail,
        "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
    })
    del activity[200:]


def list_targets(client: MediumClient) -> int:
    user = client.me()
    user_id = str(user.get("id") or "")
    if not user_id:
        raise PublisherError("Medium did not return an authenticated user ID.")
    print(f'user\t{user_id}\t{user.get("name") or user.get("username") or "Medium profile"}\t{user.get("url") or ""}')
    for publication in client.publications(user_id):
        publication_id = str(publication.get("id") or "")
        if publication_id:
            print(
                f'publication\t{publication_id}\t'
                f'{publication.get("name") or publication.get("slug") or "Medium publication"}\t'
                f'{publication.get("url") or ""}'
            )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Render Hugo Markdown and publish it through Medium's legacy API.")
    parser.add_argument("paths", nargs="*", help="Markdown files or directories to process")
    parser.add_argument("--site-root", type=Path, help="Hugo project root")
    parser.add_argument("--hugo", default=os.environ.get("HUGO_BIN", "hugo"), help="Hugo executable")
    parser.add_argument("--token-file", type=Path, default=default_config_path("token"), help="Medium integration token file")
    parser.add_argument("--state-file", type=Path, default=default_state_path(), help="Source-to-Medium mapping")
    parser.add_argument("--target-type", choices=("user", "publication"), default="user")
    parser.add_argument("--target-id", help="Medium user or publication ID")
    parser.add_argument("--mode", choices=("frontmatter", "draft", "publish"), default="frontmatter")
    parser.add_argument("--asset-base-url", help="Base URL used to expand root-relative URLs")
    parser.add_argument("--no-header-image", action="store_true")
    parser.add_argument("--content-ratio", type=float, default=DEFAULT_SYNDICATION_RATIO, help="Approximate visible article fraction to syndicate (0.10–0.95)")
    parser.add_argument("--prepare-json", action="store_true", help="Render partial editions as JSON for the assisted Publisher workflow")
    parser.add_argument("--list-targets", action="store_true", help="Validate the token and list writable targets")
    parser.add_argument("--force-new", action="store_true", help="Create another Medium post even if this source is mapped")
    parser.add_argument("--apply", action="store_true", help="Write to Medium")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not 0.10 <= args.content_ratio <= 0.95:
        raise PublisherError("--content-ratio must be between 0.10 and 0.95.")
    token_file = args.token_file.expanduser().resolve()
    if args.list_targets:
        return list_targets(MediumClient(read_token(token_file)))
    if not args.paths:
        raise PublisherError("Provide at least one Markdown file/directory, or use --list-targets.")

    starts = [Path(value) for value in args.paths] + [Path.cwd(), Path(__file__).resolve()]
    site_root = args.site_root.expanduser().resolve() if args.site_root else find_site_root(starts)
    sources = discover_markdown(args.paths, site_root)
    articles = [
        make_article(
            source,
            site_root,
            render_with_hugo(source, site_root, args.hugo),
            args.mode,
            args.asset_base_url,
            not args.no_header_image,
            args.content_ratio,
        )
        for source in sources
    ]
    if args.prepare_json:
        print(json.dumps([
            {
                "articleId": article.source.stem,
                "title": article.title,
                "canonicalUrl": article.canonical_url,
                "contentHtml": article.content,
            }
            for article in articles
        ], ensure_ascii=False))
        return 0

    for article in articles:
        print(f"[{article.publish_status.upper()}] {article.key}")
        print(f"  title:  {article.title}")
        print(f"  source: {article.canonical_url}")
        print(f"  tags:   {', '.join(article.tags) if article.tags else '(none)'}")
        print(f"  HTML:   {len(article.content):,} characters")

    if not args.apply:
        print("\nPreview only. Add --apply to write these posts to Medium.")
        return 0
    if not args.target_id:
        raise PublisherError("--target-id is required with --apply.")
    if not args.yes:
        answer = input(f"\nCreate {len(articles)} Medium post(s)? [y/N] ")
        if answer.strip().lower() not in {"y", "yes"}:
            print("Cancelled; Medium was not changed.")
            return 0

    client = MediumClient(read_token(token_file))
    state_file = args.state_file.expanduser().resolve()
    state = load_state(state_file)
    target_key = f"{args.target_type}:{args.target_id}"
    target_state = state["targets"].setdefault(target_key, {})
    failures = 0

    for article in articles:
        existing = target_state.get(article.key)
        if existing and not args.force_new:
            print(f'↷ already on Medium: {article.title} -> {existing.get("url") or existing.get("post_id")}')
            continue
        try:
            post = client.create_post(args.target_type, str(args.target_id), {
                "title": article.title,
                "contentFormat": "html",
                "content": article.content,
                "canonicalUrl": article.canonical_url,
                "tags": article.tags,
                "publishStatus": article.publish_status,
            })
            post_id = str(post.get("id") or "")
            if not post_id:
                raise PublisherError("Medium created the post but returned no post ID.")
            status = str(post.get("publishStatus") or article.publish_status).upper()
            url = str(post.get("url") or "")
            target_state[article.key] = {
                "post_id": post_id,
                "url": url,
                "status": status,
                "canonical_url": article.canonical_url,
                "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
            }
            record_activity(state, article, "created", status, url or None)
            save_private_json(state_file, state)
            print(f'✓ created as {status.lower()}: {article.title} -> {url or "post " + post_id}')
        except Exception as exc:
            failures += 1
            record_activity(state, article, "failed", "FAILED", detail=str(exc))
            save_private_json(state_file, state)
            print(f"✗ {article.key}: {exc}", file=sys.stderr)

    if failures:
        raise PublisherError(f"{failures} Medium article(s) failed; successful mappings were saved to {state_file}")
    print(f"State saved to {state_file}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (PublisherError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)

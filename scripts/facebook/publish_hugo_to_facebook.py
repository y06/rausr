#!/usr/bin/env python3
"""Prepare or publish concise Hugo article posts to a Facebook Page."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BLOGGER_ADAPTER = Path(__file__).resolve().parents[1] / "blogger"
sys.path.insert(0, str(BLOGGER_ADAPTER))

from publish_hugo_to_blogger import (  # noqa: E402
    PublisherError,
    absolute_url,
    discover_markdown,
    find_site_root,
    render_with_hugo,
    save_private_json,
    string_list,
)


DEFAULT_GRAPH_VERSION = "v26.0"


@dataclass(frozen=True)
class FacebookArticle:
    source: Path
    key: str
    title: str
    message: str
    canonical_url: str
    header_image: str
    status: str


def default_config_path(filename: str) -> Path:
    root = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return root / "hugo-facebook" / filename


def default_state_path() -> Path:
    root = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state"))
    return root / "hugo-facebook" / "state.json"


def read_token(path: Path) -> str:
    try:
        token = path.expanduser().read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise PublisherError(f"Could not read the Facebook Page access token: {exc}") from exc
    if not token:
        raise PublisherError("The Facebook Page access token is empty.")
    return token


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "targets": {}, "activity": []}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PublisherError(f"Could not read Facebook state file {path}: {exc}") from exc
    if not isinstance(state, dict) or state.get("version") != 1:
        raise PublisherError(f"Unsupported Facebook state file format: {path}")
    state.setdefault("targets", {})
    state.setdefault("activity", [])
    return state


def compact(value: str, limit: int) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    candidate = cleaned[: limit - 1]
    if " " in candidate:
        candidate = candidate.rsplit(" ", 1)[0]
    return candidate.rstrip(".,;: ") + "…"


def hashtags(values: list[str]) -> list[str]:
    mapping = {
        "ai": "AI", "ux-ui": "UXDesign", "ux ui": "UXDesign", "ux": "UXDesign",
        "graphic design": "GraphicDesign", "product design": "ProductDesign", "web design": "WebDesign",
        "branding": "Branding", "creativity": "Creativity", "philosophy": "DesignThinking",
        "history": "DesignHistory", "reports": "DesignResearch", "exhibition": "ExhibitionDesign",
        "hardware": "Technology", "series": "Design",
    }
    result = ["Design"]
    for raw in values:
        normalized = raw.strip().lower()
        tag = mapping.get(normalized) or "".join(part.capitalize() for part in normalized.replace("-", " ").split())
        if tag and tag.lower() not in {item.lower() for item in result}:
            result.append(tag)
        if len(result) == 4:
            break
    return result


def make_article(source: Path, site_root: Path, payload: dict[str, Any], mode: str, include_header: bool) -> FacebookArticle:
    base_url = str(payload.get("baseURL") or "")
    canonical_url = absolute_url(str(payload.get("permalink") or ""), base_url)
    if not canonical_url:
        raise PublisherError(f"Hugo did not produce a permalink for {source}")
    title = str(payload.get("title") or source.stem)
    summary = compact(str(payload.get("description") or "A new perspective from the Rausr design journal."), 320)
    labels = list(dict.fromkeys(string_list(payload.get("tags")) + string_list(payload.get("categories"))))
    tag_line = " ".join(f"#{tag}" for tag in hashtags(labels))
    message = f"{title}\n\n{summary}\n\nRead the full article on Rausr:\n{canonical_url}\n\n{tag_line}"
    header = absolute_url(str(payload.get("headerImage") or ""), base_url) if include_header else ""
    is_draft = mode == "draft" or (mode == "frontmatter" and bool(payload.get("draft", False)))
    return FacebookArticle(
        source=source,
        key=source.relative_to(site_root).as_posix(),
        title=title,
        message=message,
        canonical_url=canonical_url,
        header_image=header,
        status="DRAFT" if is_draft else "PUBLISHED",
    )


class FacebookClient:
    def __init__(self, token: str, version: str):
        self.token = token
        self.base = f"https://graph.facebook.com/{version}"

    def request(self, method: str, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        values = {key: str(value).lower() if isinstance(value, bool) else str(value) for key, value in (params or {}).items()}
        data = urlencode(values).encode("utf-8") if method != "GET" and values else None
        url = f"{self.base}{path}"
        if method == "GET" and values:
            url += "?" + urlencode(values)
        request = Request(url, data=data, method=method, headers={"Authorization": f"Bearer {self.token}", "Accept": "application/json"})
        try:
            with urlopen(request, timeout=60) as response:
                decoded = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:1200]
            raise PublisherError(f"Facebook Graph API {method} {path} failed ({exc.code}): {detail}") from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise PublisherError(f"Facebook Graph API request failed: {exc}") from exc
        if not isinstance(decoded, dict):
            raise PublisherError("Facebook returned an unexpected response.")
        if "error" in decoded:
            raise PublisherError(f"Facebook Graph API error: {decoded['error']}")
        return decoded

    def page(self, page_id: str) -> dict[str, Any]:
        return self.request("GET", f"/{page_id}", {"fields": "id,name,link"})

    def publish(self, page_id: str, article: FacebookArticle) -> dict[str, Any]:
        published = article.status == "PUBLISHED"
        if article.header_image:
            result = self.request("POST", f"/{page_id}/photos", {
                "url": article.header_image,
                "caption": article.message,
                "published": published,
            })
            object_id = str(result.get("post_id") or result.get("id") or "")
        else:
            result = self.request("POST", f"/{page_id}/feed", {
                "message": article.message,
                "link": article.canonical_url,
                "published": published,
            })
            object_id = str(result.get("id") or "")
        if not object_id:
            raise PublisherError("Facebook accepted the request but returned no post ID.")
        try:
            details = self.request("GET", f"/{object_id}", {"fields": "permalink_url"})
            permalink = str(details.get("permalink_url") or "")
        except PublisherError:
            permalink = ""
        return {"id": object_id, "url": permalink}


def record_activity(state: dict[str, Any], article: FacebookArticle, action: str, url: str = "", detail: str = "") -> None:
    entries = state.setdefault("activity", [])
    entries.insert(0, {
        "provider": "facebook", "title": article.title, "source": article.key,
        "action": action, "status": article.status, "url": url, "detail": detail,
        "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
    })
    del entries[200:]


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Prepare or publish Hugo articles to a Facebook Page.")
    result.add_argument("paths", nargs="*", help="Markdown files or directories")
    result.add_argument("--site-root", type=Path)
    result.add_argument("--hugo", default=os.environ.get("HUGO_BIN", "hugo"))
    result.add_argument("--page-id", required=True)
    result.add_argument("--token-file", type=Path, default=default_config_path("token"))
    result.add_argument("--state-file", type=Path, default=default_state_path())
    result.add_argument("--graph-version", default=DEFAULT_GRAPH_VERSION)
    result.add_argument("--mode", choices=("frontmatter", "draft", "publish"), default="frontmatter")
    result.add_argument("--no-header-image", action="store_true")
    result.add_argument("--validate", action="store_true")
    result.add_argument("--force-new", action="store_true")
    result.add_argument("--apply", action="store_true")
    result.add_argument("--yes", action="store_true")
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.validate:
        client = FacebookClient(read_token(args.token_file), args.graph_version)
        page = client.page(args.page_id)
        print(f'{page.get("id") or args.page_id}\t{page.get("name") or "Facebook Page"}\t{page.get("link") or ""}')
        return 0
    if not args.paths:
        raise PublisherError("Provide at least one Markdown file, or use --validate.")
    starts = [Path(value) for value in args.paths] + [Path.cwd(), Path(__file__).resolve()]
    site_root = args.site_root.expanduser().resolve() if args.site_root else find_site_root(starts)
    sources = discover_markdown(args.paths, site_root)
    articles = [make_article(source, site_root, render_with_hugo(source, site_root, args.hugo), args.mode, not args.no_header_image) for source in sources]
    for article in articles:
        print(f"[{article.status}] {article.key}\n  title: {article.title}\n  source: {article.canonical_url}\n  image: {article.header_image or '(link preview)'}\n  copy: {len(article.message)} characters")
    if not args.apply:
        print("\nPreview only. Add --apply to publish these Facebook Page posts.")
        return 0
    client = FacebookClient(read_token(args.token_file), args.graph_version)
    if not args.yes:
        answer = input(f"\nSend {len(articles)} post(s) to Facebook? [y/N] ")
        if answer.strip().lower() not in {"y", "yes"}:
            print("Cancelled; Facebook was not changed.")
            return 0
    state_file = args.state_file.expanduser().resolve()
    state = load_state(state_file)
    target = state["targets"].setdefault(f"page:{args.page_id}", {})
    failures = 0
    for article in articles:
        existing = target.get(article.key)
        if existing and not args.force_new:
            print(f'↷ already on Facebook: {article.title} -> {existing.get("url") or existing.get("post_id")}')
            continue
        try:
            post = client.publish(args.page_id, article)
            now = datetime.now().astimezone().isoformat(timespec="seconds")
            target[article.key] = {
                "post_id": post["id"], "url": post["url"], "status": article.status,
                "canonical_url": article.canonical_url, "updated_at": now,
            }
            record_activity(state, article, "created through Graph API", post["url"])
            save_private_json(state_file, state)
            print(f'✓ {article.status.lower()}: {article.title} -> {post["url"] or post["id"]}')
        except Exception as exc:
            failures += 1
            record_activity(state, article, "failed", detail=str(exc))
            save_private_json(state_file, state)
            print(f"✗ {article.key}: {exc}", file=sys.stderr)
    if failures:
        raise PublisherError(f"{failures} Facebook article(s) failed; successful mappings were saved.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PublisherError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(2)

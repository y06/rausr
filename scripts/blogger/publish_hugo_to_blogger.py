#!/usr/bin/env python3
"""Render Hugo Markdown and create or update posts through Blogger API v3."""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import date, datetime, time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin
from zoneinfo import ZoneInfo


BLOGGER_SCOPE = "https://www.googleapis.com/auth/blogger"
BLOGGER_API = "https://www.googleapis.com/blogger/v3"
DEFAULT_SYNDICATION_RATIO = 0.70
CONFIG_NAMES = ("hugo.toml", "hugo.yaml", "hugo.yml", "config.toml", "config.yaml", "config.yml")
MARKER_TEMPLATE = r'''{{- $published := "" -}}
{{- if not .PublishDate.IsZero -}}{{- $published = .PublishDate.Format "2006-01-02T15:04:05Z07:00" -}}{{- end -}}
{{- dict
  "title" .Title
  "description" (default "" .Params.description)
  "published" $published
  "draft" .Draft
  "tags" (default (slice) .Params.tags)
  "categories" (default (slice) .Params.categories)
  "headerImage" (default "" .Params.header_image)
  "bloggerId" (default "" .Params.blogger_id)
  "baseURL" .Site.BaseURL
  "permalink" .Permalink
  "content" (printf "%s" .Content)
  | jsonify -}}'''


class PublisherError(RuntimeError):
    pass


class PostCreatedError(PublisherError):
    """The draft exists remotely, but its follow-up publish request failed."""

    def __init__(self, post: dict[str, Any], cause: Exception):
        self.post = post
        super().__init__(f"draft {post.get('id')} was created, but publishing failed: {cause}")


@dataclass(frozen=True)
class Article:
    source: Path
    key: str
    title: str
    content: str
    labels: list[str]
    publish_at: datetime
    draft: bool
    blogger_id: str | None
    canonical_url: str


def eprint(message: str) -> None:
    print(message, file=sys.stderr)


def find_site_root(start_points: Iterable[Path]) -> Path:
    checked: set[Path] = set()
    for start in start_points:
        current = start.resolve()
        if current.is_file():
            current = current.parent
        for candidate in (current, *current.parents):
            if candidate in checked:
                continue
            checked.add(candidate)
            if (candidate / "content").is_dir() and any((candidate / name).is_file() for name in CONFIG_NAMES):
                return candidate
    raise PublisherError("Could not find a Hugo site root (content/ plus a Hugo config file). Use --site-root.")


def find_config(site_root: Path) -> Path:
    for name in CONFIG_NAMES:
        candidate = site_root / name
        if candidate.is_file():
            return candidate
    raise PublisherError(f"No Hugo config found in {site_root}")


def discover_markdown(inputs: list[str], site_root: Path) -> list[Path]:
    discovered: list[Path] = []
    for value in inputs:
        path = Path(value).expanduser().resolve()
        if path.is_dir():
            discovered.extend(sorted(path.rglob("*.md")))
        elif path.is_file():
            discovered.append(path)
        else:
            raise PublisherError(f"Input does not exist: {value}")

    content_root = (site_root / "content").resolve()
    unique: dict[Path, None] = {}
    for path in discovered:
        if path.name.startswith("_"):
            continue
        try:
            path.relative_to(content_root)
        except ValueError as exc:
            raise PublisherError(f"Article must be inside {content_root}: {path}") from exc
        unique[path] = None
    if not unique:
        raise PublisherError("No publishable Markdown files found (section files such as _index.md are skipped).")
    return list(unique)


def render_with_hugo(source: Path, site_root: Path, hugo_bin: str) -> dict[str, Any]:
    content_root = site_root / "content"
    relative = source.relative_to(content_root)
    config = find_config(site_root)

    with tempfile.TemporaryDirectory(prefix="hugo-blogger-") as temporary:
        temp_root = Path(temporary)
        (temp_root / "content" / relative.parent).mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, temp_root / "content" / relative)
        shutil.copy2(config, temp_root / config.name)

        layouts = temp_root / "layouts"
        (layouts / relative.parts[0]).mkdir(parents=True, exist_ok=True)
        (layouts / "_default").mkdir(parents=True, exist_ok=True)
        (layouts / relative.parts[0] / "single.html").write_text(MARKER_TEMPLATE, encoding="utf-8")
        (layouts / "_default" / "single.html").write_text(MARKER_TEMPLATE, encoding="utf-8")

        project_shortcodes = site_root / "layouts" / "shortcodes"
        if project_shortcodes.is_dir():
            shutil.copytree(project_shortcodes, layouts / "shortcodes")

        output = temp_root / "public"
        command = [
            hugo_bin,
            "--source", str(temp_root),
            "--destination", str(output),
            "--config", config.name,
            "--buildDrafts",
            "--buildFuture",
            "--buildExpired",
            "--cleanDestinationDir",
            "--quiet",
        ]
        completed = subprocess.run(command, text=True, capture_output=True, check=False)
        if completed.returncode:
            detail = completed.stderr.strip() or completed.stdout.strip()
            raise PublisherError(f"Hugo could not render {source.name}:\n{detail}")

        candidates = [path for path in output.rglob("*.html") if path.name == "index.html"]
        payloads: list[dict[str, Any]] = []
        for candidate in candidates:
            try:
                decoded = json.loads(candidate.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            if isinstance(decoded, dict) and "content" in decoded and "title" in decoded:
                payloads.append(decoded)
        if len(payloads) != 1:
            raise PublisherError(
                f"Expected one rendered article for {source.name}, found {len(payloads)}. "
                "Check its Hugo layout/type settings."
            )
        return payloads[0]


def front_matter_text(source: Path) -> str:
    text_value = source.read_text(encoding="utf-8")
    if not text_value.startswith("---"):
        return ""
    match = re.match(r"^---\s*\n(.*?)\n---\s*(?:\n|$)", text_value, flags=re.DOTALL)
    return match.group(1) if match else ""


def date_literal(source: Path) -> str | None:
    matter = front_matter_text(source)
    for field in ("publishDate", "publishdate", "date"):
        match = re.search(rf"(?mi)^{re.escape(field)}\s*:\s*([^#\n]+?)\s*$", matter)
        if match:
            return match.group(1).strip().strip("'\"")
    return None


def parse_publish_datetime(source: Path, rendered: str, clock: time, timezone_name: str) -> datetime:
    timezone = ZoneInfo(timezone_name)
    raw = date_literal(source) or rendered
    if not raw:
        raise PublisherError(f"Missing date/publishDate in {source}")
    normalized = raw.strip().replace("Z", "+00:00")
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", normalized):
            parsed: datetime = datetime.combine(date.fromisoformat(normalized), clock)
        else:
            parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise PublisherError(f"Unsupported date in {source}: {raw!r}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone)
    return parsed


def parse_clock(value: str) -> time:
    try:
        return time.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Expected HH:MM or HH:MM:SS") from exc


def string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    raise PublisherError(f"Expected a string or list of strings, got {type(value).__name__}")


def absolute_url(value: str, base_url: str) -> str:
    if value.startswith("/") and not value.startswith("//"):
        return urljoin(base_url.rstrip("/") + "/", value.lstrip("/"))
    return value


def absolutize_html_urls(content: str, base_url: str) -> str:
    attribute_pattern = re.compile(
        r"(?P<prefix>\b(?:href|src|poster|action)\s*=\s*)(?P<quote>['\"])(?P<url>/[^'\"]*)(?P=quote)",
        flags=re.IGNORECASE,
    )

    def replace_attribute(match: re.Match[str]) -> str:
        value = absolute_url(match.group("url"), base_url)
        return f'{match.group("prefix")}{match.group("quote")}{value}{match.group("quote")}'

    content = attribute_pattern.sub(replace_attribute, content)
    srcset_pattern = re.compile(
        r"(?P<prefix>\bsrcset\s*=\s*)(?P<quote>['\"])(?P<value>[^'\"]*)(?P=quote)",
        flags=re.IGNORECASE,
    )

    def replace_srcset(match: re.Match[str]) -> str:
        entries = []
        for entry in match.group("value").split(","):
            pieces = entry.strip().split(maxsplit=1)
            if pieces:
                pieces[0] = absolute_url(pieces[0], base_url)
            entries.append(" ".join(pieces))
        value = ", ".join(entries)
        return f'{match.group("prefix")}{match.group("quote")}{value}{match.group("quote")}'

    return srcset_pattern.sub(replace_srcset, content)


class _SyndicationHTMLParser(HTMLParser):
    """Collect safe HTML cut points while retaining enough structure to rebalance tags."""

    block_tags = {"p", "blockquote", "pre", "figure", "ul", "ol", "table", "div", "section", "article"}
    void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
    hidden_tags = {"script", "style", "template"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.tokens: list[str] = []
        self.open_tags: list[str] = []
        self.visible_characters = 0
        self.hidden_depth = 0
        self.candidates: list[tuple[int, int, tuple[str, ...]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized = tag.lower()
        self.tokens.append(self.get_starttag_text() or f"<{tag}>")
        if normalized not in self.void_tags:
            self.open_tags.append(normalized)
        if normalized in self.hidden_tags:
            self.hidden_depth += 1

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tokens.append(self.get_starttag_text() or f"<{tag} />")

    def handle_endtag(self, tag: str) -> None:
        normalized = tag.lower()
        self.tokens.append(f"</{tag}>")
        if normalized in self.hidden_tags and self.hidden_depth:
            self.hidden_depth -= 1
        if normalized in self.open_tags:
            match = len(self.open_tags) - 1 - self.open_tags[::-1].index(normalized)
            del self.open_tags[match:]
        if normalized in self.block_tags and self.visible_characters:
            self.candidates.append((self.visible_characters, len(self.tokens), tuple(self.open_tags)))

    def handle_data(self, data: str) -> None:
        self.tokens.append(data)
        if not self.hidden_depth:
            self.visible_characters += len(re.sub(r"\s+", " ", data).strip())

    def handle_entityref(self, name: str) -> None:
        self.tokens.append(f"&{name};")
        if not self.hidden_depth:
            self.visible_characters += 1

    def handle_charref(self, name: str) -> None:
        self.tokens.append(f"&#{name};")
        if not self.hidden_depth:
            self.visible_characters += 1

    def handle_comment(self, data: str) -> None:
        self.tokens.append(f"<!--{data}-->")

    def handle_decl(self, decl: str) -> None:
        self.tokens.append(f"<!{decl}>")

    def handle_pi(self, data: str) -> None:
        self.tokens.append(f"<?{data}>")


def truncate_html_at_block(content: str, ratio: float = DEFAULT_SYNDICATION_RATIO) -> tuple[str, float]:
    """Keep approximately ratio of visible text and close any still-open parent tags."""
    parser = _SyndicationHTMLParser()
    parser.feed(content)
    parser.close()
    total = parser.visible_characters
    if total == 0 or not parser.candidates:
        return content, 1.0

    target = total * ratio
    usable = [candidate for candidate in parser.candidates if total * 0.45 <= candidate[0] <= total * 0.88]
    choices = usable or parser.candidates
    visible, token_count, open_tags = min(choices, key=lambda candidate: abs(candidate[0] - target))
    excerpt = "".join(parser.tokens[:token_count]).rstrip()
    if open_tags:
        excerpt += "".join(f"</{tag}>" for tag in reversed(open_tags))
    return excerpt, visible / total


def syndicated_content(
    content: str,
    canonical_url: str,
    title: str,
    ratio: float = DEFAULT_SYNDICATION_RATIO,
) -> str:
    """Create a partial edition with a crawlable, descriptive continuation link."""
    excerpt, retained = truncate_html_at_block(content, ratio)
    escaped_url = html.escape(canonical_url, quote=True)
    escaped_title = html.escape(title)
    continuation = (
        '<aside class="rausr-continue-reading" data-original-url="' + escaped_url + '" '
        f'data-content-retained="{retained:.2f}">'
        '<p><strong>Continue with the complete story on Rausr.</strong></p>'
        '<p>This syndicated edition contains an excerpt. Read '
        '<a href="' + escaped_url + '">“' + escaped_title + '” in full on rausr.com</a> '
        'for the remaining insights, examples, and references.</p>'
        '</aside>'
    )
    return f"{excerpt}\n{continuation}\n"


def make_article(
    source: Path,
    site_root: Path,
    payload: dict[str, Any],
    mode: str,
    publish_clock: time,
    timezone_name: str,
    asset_base_url: str | None,
    include_header_image: bool,
    content_ratio: float = DEFAULT_SYNDICATION_RATIO,
) -> Article:
    base_url = asset_base_url or str(payload.get("baseURL") or "")
    if not base_url:
        raise PublisherError("The Hugo baseURL is empty; set it in the config or pass --asset-base-url.")

    canonical_url = absolute_url(str(payload.get("permalink") or ""), base_url)
    if not canonical_url:
        raise PublisherError(f"Hugo did not produce a permalink for {source}")
    content = absolutize_html_urls(str(payload["content"]), base_url)
    content = syndicated_content(content, canonical_url, str(payload["title"]), content_ratio)
    header_image = str(payload.get("headerImage") or "")
    if include_header_image and header_image:
        header_url = absolute_url(header_image, base_url)
        alt = html.escape(f'{payload["title"]} header image', quote=True)
        content = f'<p><img src="{html.escape(header_url, quote=True)}" alt="{alt}"></p>\n{content}'

    labels = list(dict.fromkeys(string_list(payload.get("tags")) + string_list(payload.get("categories"))))
    if mode == "draft":
        is_draft = True
    elif mode == "publish":
        is_draft = False
    else:
        is_draft = bool(payload.get("draft", False))

    relative = source.relative_to(site_root).as_posix()
    raw_blogger_id = str(payload.get("bloggerId") or "").strip()
    return Article(
        source=source,
        key=relative,
        title=str(payload["title"]),
        content=content,
        labels=labels,
        publish_at=parse_publish_datetime(source, str(payload.get("published") or ""), publish_clock, timezone_name),
        draft=is_draft,
        blogger_id=raw_blogger_id or None,
        canonical_url=canonical_url,
    )


def rfc3339(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def default_config_path(filename: str) -> Path:
    root = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return root / "hugo-blogger" / filename


def default_state_path() -> Path:
    root = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local" / "state"))
    return root / "hugo-blogger" / "state.json"


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "blogs": {}, "activity": []}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PublisherError(f"Could not read state file {path}: {exc}") from exc
    if not isinstance(state, dict) or state.get("version") != 1:
        raise PublisherError(f"Unsupported state file format: {path}")
    state.setdefault("blogs", {})
    state.setdefault("activity", [])
    return state


def record_activity(
    state: dict[str, Any],
    article: Article,
    action: str,
    status: str,
    url: str | None = None,
    detail: str | None = None,
) -> None:
    activity = state.setdefault("activity", [])
    activity.insert(0, {
        "provider": "blogger",
        "title": article.title,
        "source": article.key,
        "action": action,
        "status": status.upper(),
        "url": url,
        "detail": detail or "",
        "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
    })
    del activity[200:]


def save_private_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.chmod(stat.S_IRUSR | stat.S_IWUSR)
    temporary.replace(path)


def authorized_session(client_secret: Path | None, token_file: Path):
    try:
        from google.auth.transport.requests import AuthorizedSession, Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError as exc:
        raise PublisherError(
            "Google authentication packages are missing. Install requirements-blogger.txt in a virtual environment."
        ) from exc

    credentials = None
    if token_file.exists():
        credentials = Credentials.from_authorized_user_file(str(token_file), [BLOGGER_SCOPE])
    if credentials and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
    if not credentials or not credentials.valid:
        if client_secret is None:
            raise PublisherError("OAuth login is required. Pass --client-secret /path/to/client_secret.json once.")
        if not client_secret.is_file():
            raise PublisherError(f"OAuth client secret file not found: {client_secret}")
        flow = InstalledAppFlow.from_client_secrets_file(str(client_secret), [BLOGGER_SCOPE])
        credentials = flow.run_local_server(port=0, prompt="consent", access_type="offline")
    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text(credentials.to_json() + "\n", encoding="utf-8")
    token_file.chmod(stat.S_IRUSR | stat.S_IWUSR)
    return AuthorizedSession(credentials)


class BloggerClient:
    def __init__(self, session, blog_id: str):
        self.session = session
        self.blog_id = blog_id

    def request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        response = self.session.request(method, f"{BLOGGER_API}{path}", timeout=60, **kwargs)
        if not response.ok:
            detail = response.text[:1000]
            raise PublisherError(f"Blogger API {method} {path} failed ({response.status_code}): {detail}")
        if not response.content:
            return {}
        decoded = response.json()
        return decoded if isinstance(decoded, dict) else {}

    def verify_blog(self) -> dict[str, Any]:
        return self.request("GET", f"/blogs/{self.blog_id}")

    def get_post(self, post_id: str) -> dict[str, Any] | None:
        response = self.session.get(f"{BLOGGER_API}/blogs/{self.blog_id}/posts/{post_id}", timeout=60)
        if response.status_code == 404:
            return None
        if not response.ok:
            raise PublisherError(f"Blogger API could not read post {post_id} ({response.status_code}): {response.text[:1000]}")
        return response.json()

    def create_draft(self, body: dict[str, Any]) -> dict[str, Any]:
        return self.request(
            "POST",
            f"/blogs/{self.blog_id}/posts",
            params={"isDraft": "true"},
            json=body,
        )

    def patch_post(self, post_id: str, body: dict[str, Any]) -> dict[str, Any]:
        return self.request(
            "PATCH",
            f"/blogs/{self.blog_id}/posts/{post_id}",
            json=body,
        )

    def publish(self, post_id: str, publish_at: datetime) -> dict[str, Any]:
        return self.request(
            "POST",
            f"/blogs/{self.blog_id}/posts/{post_id}/publish",
            params={"publishDate": rfc3339(publish_at)},
        )

    def revert(self, post_id: str) -> dict[str, Any]:
        return self.request("POST", f"/blogs/{self.blog_id}/posts/{post_id}/revert")


def article_body(article: Article, blog_id: str) -> dict[str, Any]:
    return {
        "kind": "blogger#post",
        "blog": {"id": blog_id},
        "title": article.title,
        "titleLink": article.canonical_url,
        "content": article.content,
        "labels": article.labels,
    }


def publish_article(client: BloggerClient, article: Article, mapped_id: str | None) -> tuple[dict[str, Any], str]:
    post_id = article.blogger_id or mapped_id
    existing = client.get_post(post_id) if post_id else None
    body = article_body(article, client.blog_id)

    if post_id and existing is None:
        eprint(f"  Stored Blogger post {post_id} no longer exists; creating a replacement.")
        post_id = None

    if post_id:
        post = client.patch_post(post_id, body)
        action = "updated"
        status = str(post.get("status") or existing.get("status") or "").upper()
        if article.draft and status != "DRAFT":
            post = client.revert(post_id)
            action = "updated and reverted to draft"
        elif not article.draft and status in {"DRAFT", "SCHEDULED"}:
            if status == "SCHEDULED":
                client.revert(post_id)
            post = client.publish(post_id, article.publish_at)
            action = "updated and published/scheduled"
        return post, action

    post = client.create_draft(body)
    post_id = str(post["id"])
    if article.draft:
        return post, "created as draft"
    try:
        return client.publish(post_id, article.publish_at), "created and published/scheduled"
    except Exception as exc:
        raise PostCreatedError(post, exc) from exc


def preview(article: Article, output_dir: Path | None) -> None:
    status = "DRAFT" if article.draft else "PUBLISH/SCHEDULE"
    print(f"[{status}] {article.key}")
    print(f"  title:  {article.title}")
    print(f"  date:   {rfc3339(article.publish_at)}")
    print(f"  labels: {', '.join(article.labels) if article.labels else '(none)'}")
    print(f"  source: {article.canonical_url}")
    print(f"  HTML:   {len(article.content):,} characters")
    if article.blogger_id:
        print(f"  Blogger ID from front matter: {article.blogger_id}")
    if output_dir:
        destination = output_dir / article.source.with_suffix(".html").name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(article.content + "\n", encoding="utf-8")
        print(f"  preview: {destination}")


def list_blogs(session) -> int:
    response = session.get(f"{BLOGGER_API}/users/self/blogs", timeout=60)
    if not response.ok:
        raise PublisherError(f"Could not list Blogger blogs ({response.status_code}): {response.text[:1000]}")
    items = response.json().get("items", [])
    if not items:
        print("No Blogger blogs are available to this Google account.")
        return 0
    for item in items:
        print(f'{item.get("id")}\t{item.get("name")}\t{item.get("url")}')
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Render Hugo Markdown with Hugo and create/update Blogger posts.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("paths", nargs="*", help="Markdown files or directories to process")
    parser.add_argument("--site-root", type=Path, help="Hugo project root (normally auto-detected)")
    parser.add_argument("--hugo", default=os.environ.get("HUGO_BIN", "hugo"), help="Hugo executable")
    parser.add_argument("--blog-id", default=os.environ.get("BLOGGER_BLOG_ID"), help="Destination Blogger blog ID")
    parser.add_argument(
        "--client-secret",
        type=Path,
        default=Path(os.environ["BLOGGER_CLIENT_SECRET_FILE"]).expanduser() if os.environ.get("BLOGGER_CLIENT_SECRET_FILE") else None,
        help="Google OAuth Desktop-app client JSON (needed for the first login)",
    )
    parser.add_argument("--token-file", type=Path, default=default_config_path("token.json"), help="OAuth token cache")
    parser.add_argument("--state-file", type=Path, default=default_state_path(), help="Source-to-Blogger-ID mapping")
    parser.add_argument("--mode", choices=("frontmatter", "draft", "publish"), default="frontmatter")
    parser.add_argument("--publish-time", type=parse_clock, default=time(9, 0), help="Time used when front matter has a date only")
    parser.add_argument("--timezone", default=os.environ.get("BLOGGER_TIMEZONE", "Europe/Bratislava"))
    parser.add_argument("--asset-base-url", help="Base URL used to expand /images/... links")
    parser.add_argument("--no-header-image", action="store_true", help="Do not prepend header_image to Blogger content")
    parser.add_argument("--content-ratio", type=float, default=DEFAULT_SYNDICATION_RATIO, help="Approximate visible article fraction to syndicate (0.10–0.95)")
    parser.add_argument("--output-dir", type=Path, help="Write rendered HTML previews here")
    parser.add_argument("--apply", action="store_true", help="Write to Blogger; without this flag the command is preview-only")
    parser.add_argument("--yes", action="store_true", help="Skip the confirmation prompt used with --apply")
    parser.add_argument("--list-blogs", action="store_true", help="Authenticate and list accessible Blogger blog IDs")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not 0.10 <= args.content_ratio <= 0.95:
        raise PublisherError("--content-ratio must be between 0.10 and 0.95.")
    client_secret = args.client_secret.resolve() if args.client_secret else None
    token_file = args.token_file.expanduser().resolve()

    if args.list_blogs:
        return list_blogs(authorized_session(client_secret, token_file))
    if not args.paths:
        raise PublisherError("Provide at least one Markdown file/directory, or use --list-blogs.")

    starts = [Path(value) for value in args.paths] + [Path.cwd(), Path(__file__).resolve()]
    site_root = args.site_root.expanduser().resolve() if args.site_root else find_site_root(starts)
    sources = discover_markdown(args.paths, site_root)
    output_dir = args.output_dir.expanduser().resolve() if args.output_dir else None
    articles: list[Article] = []
    for source in sources:
        payload = render_with_hugo(source, site_root, args.hugo)
        article = make_article(
            source,
            site_root,
            payload,
            args.mode,
            args.publish_time,
            args.timezone,
            args.asset_base_url,
            not args.no_header_image,
            args.content_ratio,
        )
        articles.append(article)
        preview(article, output_dir)

    if not args.apply:
        print("\nPreview only. Add --apply to write these posts to Blogger.")
        return 0
    if not args.blog_id:
        raise PublisherError("--blog-id (or BLOGGER_BLOG_ID) is required with --apply.")
    if not args.yes:
        answer = input(f"\nCreate/update {len(articles)} Blogger post(s) in blog {args.blog_id}? [y/N] ")
        if answer.strip().lower() not in {"y", "yes"}:
            print("Cancelled; Blogger was not changed.")
            return 0

    session = authorized_session(client_secret, token_file)
    client = BloggerClient(session, str(args.blog_id))
    blog = client.verify_blog()
    print(f'\nPublishing to: {blog.get("name")} ({blog.get("url")})')
    state_file = args.state_file.expanduser().resolve()
    state = load_state(state_file)
    blog_state = state["blogs"].setdefault(str(args.blog_id), {})

    failures = 0
    for article in articles:
        try:
            mapped = blog_state.get(article.key, {})
            mapped_id = str(mapped.get("post_id")) if mapped.get("post_id") else None
            post, action = publish_article(client, article, mapped_id)
            post_id = str(post["id"])
            blog_state[article.key] = {
                "post_id": post_id,
                "url": post.get("url"),
                "status": post.get("status"),
                "canonical_url": article.canonical_url,
                "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
            }
            record_activity(
                state,
                article,
                action,
                str(post.get("status") or ("DRAFT" if article.draft else "LIVE")),
                str(post.get("url") or "") or None,
            )
            save_private_json(state_file, state)
            print(f'✓ {action}: {article.title} -> {post.get("url") or "post " + post_id}')
        except Exception as exc:  # Continue a batch but report every failed article.
            failures += 1
            if isinstance(exc, PostCreatedError):
                post = exc.post
                post_id = str(post["id"])
                blog_state[article.key] = {
                    "post_id": post_id,
                    "url": post.get("url"),
                    "status": post.get("status", "DRAFT"),
                    "canonical_url": article.canonical_url,
                    "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
                }
                record_activity(
                    state,
                    article,
                    "created as draft; publish failed",
                    "DRAFT",
                    str(post.get("url") or "") or None,
                    str(exc),
                )
            else:
                record_activity(state, article, "failed", "FAILED", detail=str(exc))
            save_private_json(state_file, state)
            eprint(f"✗ {article.key}: {exc}")
    if failures:
        raise PublisherError(f"{failures} article(s) failed; successful mappings were saved to {state_file}")
    print(f"State saved to {state_file}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (PublisherError, OSError, subprocess.SubprocessError) as exc:
        eprint(f"Error: {exc}")
        raise SystemExit(1)

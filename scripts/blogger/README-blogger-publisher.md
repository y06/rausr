# Hugo → Blogger publisher

`publish_hugo_to_blogger.py` renders the site's Markdown with Hugo, then creates or updates posts with Blogger API v3.

API references: [Posts: insert](https://developers.google.com/blogger/docs/3.0/reference/posts/insert), [Posts: publish](https://developers.google.com/blogger/docs/3.0/reference/posts/publish), and [Posts: patch](https://developers.google.com/blogger/docs/3.0/reference/posts/patch).

It maps:

- Hugo `title` → Blogger title
- approximately 70% of rendered `.Content` → a balanced Blogger HTML excerpt ending at a block boundary
- `tags` and `categories` → Blogger labels
- `date` or `publishDate` → Blogger publish/schedule date
- `draft: true` → Blogger draft
- `header_image` → the first image in Blogger content (disable with `--no-header-image`)
- `blogger_id` → an existing Blogger post to update (optional)
- Hugo `.Permalink` → Blogger `titleLink`, a visible “Continue with the complete story on Rausr” link, and the local post mapping

Root-relative links such as `/images/articles/example.jpg` are expanded with the Hugo `baseURL`. The script uses Hugo itself, so the site's custom shortcodes are rendered too.

### Original URL and canonical SEO

Every Blogger copy is a partial edition rather than a full duplicate. The publisher retains approximately 70% of visible article text, stops at the nearest sensible HTML block boundary, closes any open tags, and adds a descriptive continuation link to the complete original. The post's `titleLink` also points to the rausr.com article, and the source URL is stored in `state.json`.

The 70% default can be adjusted with `--content-ratio`. One descriptive article link plus Blogger's `titleLink` is intentional; repeating keyword-heavy backlinks would not add useful canonical signals.

Blogger API v3 does not expose a per-post field for a `<link rel="canonical">` element in the document `<head>`. A canonical element inserted into post content would be in the HTML body and Google ignores it, so this publisher deliberately does not create invalid canonical markup. If strict canonicalization is required, configure it in the Blogger theme/server layer or set syndicated Blogger copies to `noindex`.

## 1. Google setup (once)

1. In Google Cloud Console, create or select a project.
2. Enable **Blogger API v3**.
3. Configure the OAuth consent screen.
4. Create an OAuth client ID with application type **Desktop app**.
5. Download its JSON file somewhere private, outside this repository.

The OAuth scope is `https://www.googleapis.com/auth/blogger`. The login token is stored by default at `~/.config/hugo-blogger/token.json` with user-only permissions.

## 2. Install dependencies

From the Hugo repository root:

```sh
python3 -m venv .venv-blogger
. .venv-blogger/bin/activate
python -m pip install -r scripts/blogger/requirements-blogger.txt
```

Hugo must also be installed and available as `hugo`.

## 3. Find the Blogger blog ID

```sh
python scripts/blogger/publish_hugo_to_blogger.py \
  --list-blogs \
  --client-secret /private/path/client_secret.json
```

After the first login, the cached token is reused, so `--client-secret` is normally optional.

## 4. Preview one article

Preview mode does not authenticate or change Blogger:

```sh
python scripts/blogger/publish_hugo_to_blogger.py \
  content/blog/why-ai-generated-websites-look-the-same.md \
  --output-dir /tmp/blogger-preview
```

Open the generated HTML fragment if you want to inspect exactly what will be sent.

## 5. Publish one article

```sh
python scripts/blogger/publish_hugo_to_blogger.py \
  content/blog/why-ai-generated-websites-look-the-same.md \
  --blog-id YOUR_BLOG_ID \
  --apply
```

The command shows a confirmation before writing. A future front-matter date is scheduled; a past date is backdated. A date without a time uses `09:00 Europe/Bratislava` by default.

## Batch publishing

Preview every article first:

```sh
python scripts/blogger/publish_hugo_to_blogger.py content/blog
```

Then publish without the interactive confirmation (useful in automation):

```sh
BLOGGER_BLOG_ID=YOUR_BLOG_ID \
python scripts/blogger/publish_hugo_to_blogger.py content/blog --apply --yes
```

Useful overrides:

```sh
# Force every selected item to be a Blogger draft.
python scripts/blogger/publish_hugo_to_blogger.py ARTICLE.md --mode draft --apply

# Publish even when Hugo front matter says draft: true.
python scripts/blogger/publish_hugo_to_blogger.py ARTICLE.md --mode publish --apply

# Change the default time/timezone used by date-only front matter.
python scripts/blogger/publish_hugo_to_blogger.py ARTICLE.md \
  --publish-time 14:30 \
  --timezone Europe/Bratislava
```

Environment variables supported by the script:

- `BLOGGER_BLOG_ID`
- `BLOGGER_CLIENT_SECRET_FILE`
- `BLOGGER_TIMEZONE`
- `HUGO_BIN`

## Duplicate protection and updates

New posts are first created as drafts, then published or scheduled when required. The script stores the Blogger post ID for each source file in `~/.local/state/hugo-blogger/state.json`. Running it again updates that post instead of inserting another one.

Successful drafts, schedules, publishes and updates—as well as failures—are appended to the same state file's capped activity log for display in Rausr Publisher.

For a portable source-controlled mapping, add this to an article's front matter:

```yaml
blogger_id: "1234567890123456789"
```

`blogger_id` takes precedence over the local state file. Keep the OAuth client JSON and token out of Git.

# Rausr Publisher for Safari

A local Safari Web Extension and macOS companion for reviewing Hugo articles and publishing them to Blogger, Medium, LinkedIn, and Facebook. The interface follows the Rausr visual system—Satoshi and Inter, purple and ink, mint/turquoise accents, compact capsules, generous spacing—adapted into a step-by-step software workspace.

## What it does

1. Reads article metadata from `content/blog/*.md`.
2. Shows searchable articles, labels, dates, header images, excerpts and per-destination publication state.
3. Lets you choose one or more articles and review the destination and publication mode.
4. Uses a destination adapter or assisted workflow to publish each article to Blogger, Medium, LinkedIn, or Facebook.
5. Remembers provider-specific mappings, real activity, the Hugo path and publishing defaults locally.

Blogger and Medium receive partial editions by default: approximately 70% of the rendered article, cut at a valid HTML block boundary, followed by a clear link to the complete story on rausr.com. This keeps the syndication useful to readers without reproducing the complete original.

No external write happens while browsing, selecting, or reviewing. A publishing API is called only after **Publish selection** is pressed in the final review dialog.

## Project layout

```text
publisher/
├── extension/                  # Editable Web Extension source
│   ├── publisher.html          # Full publishing workspace
│   ├── popup.html              # Safari toolbar popup
│   └── assets/                 # Rausr font, logo, icons and previews
└── xcode/Rausr Publisher/
    ├── Rausr Publisher.xcodeproj
    ├── Rausr Publisher/        # macOS containing app
    └── Rausr Publisher Extension/
        ├── SafariWebExtensionHandler.swift
        └── Resources/          # Synced copy of extension/
```

The native handler validates paths and article IDs before passing them to the selected adapter: `scripts/blogger/publish_hugo_to_blogger.py`, `scripts/medium/publish_hugo_to_medium.py`, or `scripts/facebook/publish_hugo_to_facebook.py`. Python adapters own Hugo rendering, provider API requests and source-to-post mappings.

The top-level `scripts/publisher` directory owns the reusable publishing interface and macOS/Safari host. Destination-specific adapters remain in `scripts/blogger`, `scripts/medium`, and `scripts/facebook`, keeping the product ready for additional publishers.

## Publication state and activity

Each article row displays a separate capsule for every known destination, including provider, draft/published state, and a direct link when available. **Ready**, **Published**, and **Drafts** filters use these recorded provider states. The Activity view reads persistent provider history and shows the actual article, destination, action, status, timestamp, and remote link.

Older Blogger state files are supported: their existing mappings are surfaced as historical activity even when they predate the activity log.

## Medium support

Medium publishing supports profiles and publications, draft/public status, up to three Medium tags, header images, a 70% partial edition, and Medium's native `canonicalUrl` field. Medium's legacy API does not provide a post-update endpoint, so an already mapped source is skipped to prevent duplicates.

For accounts without an integration token, select **Assisted excerpt**. The extension renders and copies the formatted partial edition, opens a new Medium story, and guides you through setting the original rausr.com URL as canonical in Medium's Advanced Settings before recording the result. This replaces Medium's importer because that importer would copy the complete live article.

Medium officially no longer issues new API integration tokens or accepts new integrations. Existing tokens continue to work. If you already own one, select **API token**, paste it once, and choose your profile or publication. The native companion stores it in its private Application Support directory with user-only file permissions. Never commit a Medium token.

## LinkedIn Page support

LinkedIn publishing uses an assisted workflow that works without a LinkedIn developer application. For each selected article, Rausr Publisher creates a short Page post containing:

- the article title as a clear opening;
- a compact summary distilled from the Hugo description;
- the original rausr.com article URL, which can generate LinkedIn's link preview;
- up to four focused hashtags derived from the article taxonomy;
- the article header image as a visible preview with a full-size handoff.

The prepared post is copied to the clipboard and the configured company page opens. After posting as the Page, return to the extension and record it as a draft or published item. An optional LinkedIn post URL enables direct links from Articles and Activity.

Fully automatic organization posting can be added later, but LinkedIn's Posts API requires approved Community Management API access, the `w_organization_social` permission, and a qualifying Page role. The assisted workflow keeps credentials out of the extension and leaves the final Page post under human review.

## Facebook Page support

Facebook has two modes:

- **Assisted** works immediately. The extension prepares concise copy, the original rausr.com URL, focused hashtags, and the header image; copies the post; opens `https://www.facebook.com/rausrdotcom/`; and lets you record the result.
- **Graph API** publishes directly to the Page after you supply a numeric Page ID and Page access token. Posts with a public header image use the Page Photos endpoint; other posts use the Page Feed endpoint. Duplicate mappings and Activity are stored locally.

For API mode, create a Meta developer app, obtain the Page permissions required by the current Graph API (including `pages_manage_posts` for Page publishing), and generate a Page access token for a person with sufficient Page access. Paste the Page ID and token under **Settings → Facebook Page**, then choose **Connect Page**. The token is stored only in the app’s private Application Support directory with user-only file permissions. Never commit it.

Meta setup references: <https://developers.facebook.com/docs/pages-api/getting-started/> and <https://developers.facebook.com/docs/pages-api/posts/>.

An API “draft” is created as an unpublished Page post. Facebook may treat unpublished Page posts differently from drafts created in its own web composer.

## One-time local setup

### 1. Prepare Python

From the Rausr repository root:

```sh
python3 -m venv .venv-blogger
.venv-blogger/bin/pip install -r scripts/blogger/requirements-blogger.txt
```

The companion looks for `.venv-blogger/bin/python` first and then falls back to an installed Python 3.

### 2. Prepare Google OAuth

In Google Cloud:

1. Enable **Blogger API v3** for the project.
2. Configure the OAuth consent screen.
3. Create an OAuth client with application type **Desktop app**.
4. Download the client JSON. Do not commit it to Git.

Google setup reference: <https://developers.google.com/blogger/docs/3.0/using#auth>

### 3. Build and enable the extension

1. Open `xcode/Rausr Publisher/Rausr Publisher.xcodeproj`.
2. Select a development team under **Signing & Capabilities** if Xcode requests one.
3. Choose the **Rausr Publisher** scheme and press Run.
4. In Safari, open **Settings → Extensions** and enable **Rausr Publisher**.
5. Pin its toolbar button if desired, then choose **Open publisher**.

Apple packages Safari Web Extensions inside a containing macOS app. The generated Xcode project is the installable local host for the extension: <https://developer.apple.com/documentation/safariservices/safari-web-extensions>

## First run inside the extension

1. In **Settings → Hugo project**, keep the detected Rausr repository or paste another absolute Hugo project path, then press **Check folder**.
2. Under **Google & Blogger**, press **Choose JSON** and select the downloaded OAuth client file.
3. Press **Connect Google account** and complete Google authorization in the browser.
4. Choose the destination blog.
5. Under **Medium**, keep **Assisted excerpt** unless you already have a legacy integration token.
6. Under **LinkedIn Page**, keep `https://www.linkedin.com/company/rausr/` or enter another company page.
7. Under **Facebook Page**, keep **Assisted** for immediate use. To automate it, select **Graph API**, enter the Page ID and Page access token, and press **Connect Page**.
8. Set timezone, default time, header-image behavior and confirmation behavior.
9. Press **Save settings**.

The chosen OAuth client file is copied to `~/Library/Application Support/Rausr Publisher/client_secret.json`. The Google access token is written by the Python publisher to the user's standard local config directory. Neither belongs in the repository.

## Publishing flow

- **Ready**: valid Hugo article not yet mapped to the selected destination.
- **Published**: article has a saved published mapping for at least one destination.
- **Draft**: article has a saved draft mapping for at least one destination.
- **Hugo draft**: `draft: true` in front matter.

Select articles, open **Review selection**, choose one of:

- **Respect Hugo front matter** — drafts remain drafts; dated articles publish or schedule according to front matter.
- **Save as drafts** — overrides the batch to drafts for the selected destination.
- **Publish now** — overrides the batch to publish.

Choose **Blogger**, **Medium**, **LinkedIn**, or **Facebook** in the destination switch before reviewing. The final dialog is the write boundary. Closing it leaves every destination unchanged.

With Medium assisted excerpt, the final button copies the formatted 70% edition and opens `https://medium.com/new-story`. Paste it, then use **⋯ → More settings → Advanced Settings → This story was originally published elsewhere** to save the supplied Rausr URL as canonical. After finishing, return to Publisher, optionally paste the Medium story URL, then choose **Mark as draft** or **Mark published**.

With LinkedIn, the final button copies the distilled Page post and opens the configured company page. Paste and review the text, keep the generated link preview or attach the provided header image, then publish as the Page. Return to the extension and record the result so its status appears beside the Hugo article.

With Facebook assisted mode, the final button does the same for the configured Facebook Page. In Graph API mode, the final confirmation publishes directly; **Save as drafts** creates unpublished Page posts instead.

## Development

Edit files in `extension/`, then sync them into the generated Xcode target:

```sh
rsync -a --delete scripts/publisher/extension/ \
  "scripts/publisher/xcode/Rausr Publisher/Rausr Publisher Extension/Resources/"
```

Unsigned compile check:

```sh
xcodebuild \
  -project "scripts/publisher/xcode/Rausr Publisher/Rausr Publisher.xcodeproj" \
  -scheme "Rausr Publisher" \
  -configuration Debug \
  -derivedDataPath /tmp/rausr-publisher-derived \
  CODE_SIGNING_ALLOWED=NO build
```

The containing app and Safari extension targets keep App Sandbox enabled, with user-selected file and outbound-network capabilities. Safari requires the native extension to run in its sandboxed extension environment. Before public distribution, replace development-only local paths with persistent security-scoped bookmarks and review the credential-storage design.

## Safety and privacy

- No Google password is stored.
- No OAuth client secret or access token is bundled in the extension.
- Article content stays local until the user confirms publishing.
- Source-to-Blogger IDs are stored in the publisher state file so later runs update existing posts instead of blindly duplicating them.
- Medium source-to-post IDs are stored separately so the adapter can prevent duplicate creation.
- LinkedIn Page confirmations are stored in a separate local state file; the extension never stores LinkedIn credentials.
- Facebook assisted confirmations and Graph API mappings are stored in a separate local state file. A supplied Page access token remains in private local Application Support and is never written into the repository.
- Published mappings are read from the extension's sandbox state directory, shown with a dedicated Published filter, and refreshed immediately after each publish.
- Blogger copies contain approximately 70% of the article and receive the original Hugo permalink as their `titleLink` plus a visible continuation link. Blogger's Posts API cannot set a true per-post canonical element in the page `<head>`.
- Medium copies contain approximately 70% of the article. API copies use Medium's native `canonicalUrl`; assisted copies guide the author through Medium's manual canonical setting.
- Satoshi is used for display typography and locally bundled Inter is used for interface/body typography.
- The Python tool remains preview-only unless invoked with `--apply`; the extension adds that flag only from the final review action.

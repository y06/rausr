# Hugo → Medium publisher

This adapter renders approximately 70% of each Hugo article, ends at a balanced HTML block boundary, adds a descriptive continuation link to rausr.com, and publishes it through Medium's legacy API. It supports profile and publication targets, `draft` and `public` status, tags, header images, and Medium's native `canonicalUrl` field.

Medium no longer issues new API integration tokens and no longer accepts new integrations. Existing integration tokens continue to work. If your account already has a token, save it in a private file and connect it through Rausr Publisher.

The adapter stores source-to-post mappings in `~/.local/state/hugo-medium/state.json`. Medium's API creates posts but does not expose a post-update method; mapped sources are therefore skipped unless `--force-new` is explicitly supplied.

Preview without changing Medium:

```sh
python scripts/medium/publish_hugo_to_medium.py content/blog/example.md
```

Validate an existing token and list profile/publication targets:

```sh
python scripts/medium/publish_hugo_to_medium.py \
  --token-file /private/path/medium-token \
  --list-targets
```

Publish:

```sh
python scripts/medium/publish_hugo_to_medium.py content/blog/example.md \
  --token-file /private/path/medium-token \
  --target-type user \
  --target-id YOUR_USER_ID \
  --mode draft \
  --apply
```

Treat the integration token like a password and never commit it.

Use `--content-ratio` to adjust the partial-edition percentage. The Safari extension's no-token workflow uses `--prepare-json` internally, copies the formatted partial edition into a new Medium draft, and asks the author to set the original rausr.com URL under **More settings → Advanced Settings → This story was originally published elsewhere**.

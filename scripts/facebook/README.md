# Facebook adapter

Publishes short Hugo-derived posts to a Facebook Page through the Meta Graph API. It uses `/{page-id}/photos` when a public header image is available and `/{page-id}/feed` otherwise. The original rausr.com URL is always present in the post text.

Requirements:

- a Meta developer app with the required Page publishing access;
- a Page access token with `pages_manage_posts` and any dependent permissions required by the active Graph API version;
- Page access for the person who authorized the token.

The Safari extension stores the token in its private Application Support directory. Never commit access tokens.

Without those credentials, use the extension's default **Assisted** Facebook mode.

Meta references:

- <https://developers.facebook.com/docs/pages-api/posts/>
- <https://developers.facebook.com/docs/pages-api/getting-started/>

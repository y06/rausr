const DEMO_ARTICLES = [
  {
    id: "why-ai-generated-websites-look-the-same",
    title: "Why AI-Generated Websites Look the Same (and How to Stand Out)",
    date: "20 Oct 2026",
    isoDate: "2026-10-20T09:00:00+02:00",
    status: "ready",
    statusLabel: "Ready",
    labels: ["ux-ui", "branding", "ai", "reports"],
    image: "assets/previews/01.jpg",
    excerpt: "Ask an AI tool to make a modern website and the result may be perfectly usable. Ask it again for a different business and you may recognize the same page wearing new colors."
  },
  {
    id: "graphic-design-in-the-2010s-second-decade-21st-century",
    title: "Graphic Design in the 2010s: The Second Decade of the 21st Century",
    date: "16 Oct 2026",
    isoDate: "2026-10-16T09:00:00+02:00",
    status: "published",
    statusLabel: "Published",
    labels: ["history", "graphic design", "series"],
    image: "assets/previews/02.jpg",
    excerpt: "The 2010s made design systems, responsive interfaces and social platforms part of everyday visual language."
  },
  {
    id: "from-cursor-to-touchscreen-how-touch-interface-design-was-born",
    title: "From Cursor to Touchscreen: How Touch Interface Design Was Born",
    date: "12 Oct 2026",
    isoDate: "2026-10-12T09:00:00+02:00",
    status: "ready",
    statusLabel: "Ready",
    labels: ["ux-ui", "hardware", "history"],
    image: "assets/previews/03.jpg",
    excerpt: "Touch changed more than the pointing device. It changed scale, feedback, gesture and the physical rhythm of interfaces."
  },
  {
    id: "most-famous-running-shoe-brands-design-stories",
    title: "Most Famous Running Shoe Brands: Design Stories Behind the Miles",
    date: "09 Oct 2026",
    isoDate: "2026-10-09T09:00:00+02:00",
    status: "draft",
    statusLabel: "Hugo draft",
    labels: ["branding", "product design", "series"],
    image: "assets/previews/04.jpg",
    excerpt: "Running-shoe identities connect performance engineering with visual stories that must work at speed and at shelf distance."
  },
  {
    id: "university-exhibition-stand-design-student-recruitment",
    title: "University Exhibition Stand Design for Student Recruitment",
    date: "06 Oct 2026",
    isoDate: "2026-10-06T09:00:00+02:00",
    status: "ready",
    statusLabel: "Ready",
    labels: ["exhibition", "branding", "reports"],
    image: "assets/previews/05.jpg",
    excerpt: "A university stand needs to explain possibility quickly while still feeling like a credible place to spend several formative years."
  },
  {
    id: "how-graphic-designers-handle-feedback-without-taking-it-personally",
    title: "How Graphic Designers Handle Feedback Without Taking It Personally",
    date: "03 Oct 2026",
    isoDate: "2026-10-03T09:00:00+02:00",
    status: "published",
    statusLabel: "Published",
    labels: ["graphic design", "philosophy", "reports"],
    image: "assets/previews/06.jpg",
    excerpt: "Professional critique becomes useful when the work, the goal and the person are treated as three different things."
  }
];

const state = {
  articles: [],
  selected: new Set(),
  previewId: null,
  filter: "all",
  search: "",
  activity: [],
  mediumTargets: [],
  companionAvailable: false,
  configuration: {
    projectPath: "",
    oauthClientPath: "",
    blogId: "",
    blogName: "",
    activeProvider: "blogger",
    mediumTokenPath: "",
    mediumPublishingMode: "import",
    mediumUserName: "",
    mediumTargetType: "user",
    mediumTargetId: "",
    mediumTargetName: "",
    linkedinCompanyURL: "https://www.linkedin.com/company/rausr/",
    facebookPublishingMode: "assisted",
    facebookPageURL: "https://www.facebook.com/rausrdotcom/",
    facebookPageId: "",
    facebookPageName: "Rausr",
    facebookTokenPath: "",
    timezone: "Europe/Bratislava",
    publishTime: "09:00",
    includeHeaderImage: true,
    confirmBeforePublish: true
  }
};

let pendingOAuthClientJSON = "";

const elements = Object.fromEntries([
  "articleList", "articleCount", "readyCount", "selectedCount", "stickyCount", "selectionBubbles",
  "selectAll", "searchInput", "emptyState", "previewCover", "previewLabels", "previewTitle", "previewMeta",
  "previewExcerpt", "reviewButton", "saveDraftButton", "reviewDialog", "reviewForm", "reviewSummary", "publishButton",
  "onboardingDialog", "toast", "toastText", "connectionCard", "connectionTitle", "connectionText", "profileBlog",
  "projectPath", "hugoStatus", "oauthClientInput", "oauthClientFileInput", "blogSelect", "timezoneSelect", "publishTimeInput", "headerImageToggle",
  "confirmationToggle", "settingsMessage", "activityList", "viewTitle", "mediumTokenInput", "mediumTargetSelect",
  "heroDestinationLabel", "reviewDestinationText", "reviewSafetyText", "publishModeTitle", "publishModeDescription",
  "mediumModeImport", "mediumModeToken", "mediumTokenFields", "mediumImportDialog", "mediumImportTitle",
  "mediumImportSource", "mediumStoryURL", "copyMediumSourceButton", "copyMediumExcerptButton", "markMediumDraft", "markMediumPublished",
  "linkedinCompanyURL", "linkedinPostDialog", "linkedinPostTitle", "linkedinPostCopy", "linkedinHeaderPreview",
  "copyLinkedInPostButton", "openLinkedInImageButton", "linkedinPostURL", "markLinkedInDraft", "markLinkedInPublished",
  "facebookModeAssisted", "facebookModeAPI", "facebookAPIFields", "facebookPageURL", "facebookPageId",
  "facebookTokenInput", "facebookConnectButton", "facebookPostDialog", "facebookPostTitle", "facebookPostCopy",
  "facebookHeaderPreview", "copyFacebookPostButton", "openFacebookImageButton", "facebookPostURL",
  "markFacebookDraft", "markFacebookPublished"
].map(id => [id, document.getElementById(id)]));

let pendingMediumImports = [];
let currentMediumImport = null;
let pendingLinkedInPosts = [];
let currentLinkedInPost = null;
let pendingFacebookPosts = [];
let currentFacebookPost = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function visibleArticles() {
  return state.articles.filter(article => {
    const statuses = Array.isArray(article.filterStates) ? article.filterStates : [article.status];
    const matchesFilter = state.filter === "all" || statuses.includes(state.filter);
    const haystack = `${article.title} ${article.labels.join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(state.search.toLowerCase());
  });
}

function articleById(id) {
  return state.articles.find(article => article.id === id);
}

function renderArticles() {
  const articles = visibleArticles();
  elements.articleList.innerHTML = articles.map(article => `
    <article class="article-row${state.selected.has(article.id) ? " is-selected" : ""}${state.previewId === article.id ? " is-previewing" : ""}" data-article-id="${escapeHtml(article.id)}">
      <label class="check-control" aria-label="Select ${escapeHtml(article.title)}">
        <input type="checkbox" ${state.selected.has(article.id) ? "checked" : ""}><span></span>
      </label>
      <img class="article-thumb" src="${escapeHtml(article.image)}" alt="">
      <div class="article-main">
        <div class="article-kicker"><i class="${article.status === "draft" ? "is-draft" : ""}"></i>${escapeHtml(article.statusLabel)}</div>
        <h3 class="article-title">${escapeHtml(article.title)}</h3>
        <div class="article-tags">${article.labels.slice(0, 3).map(label => `<span class="mini-tag">${escapeHtml(label)}</span>`).join("")}</div>
        <div class="article-destinations">${(article.destinations || []).map(destination => {
          const providerIcon = destination.provider === "medium" ? "M" : (destination.provider === "linkedin" ? "in" : (destination.provider === "facebook" ? "f" : "B"));
          const content = `<i>${providerIcon}</i>${escapeHtml(destination.providerLabel)} · ${escapeHtml(destination.statusLabel)}`;
          return destination.url
            ? `<a class="destination-chip ${destination.status === "draft" ? "is-draft" : ""}" href="${escapeHtml(destination.url)}" target="_blank" rel="noopener">${content}</a>`
            : `<span class="destination-chip ${destination.status === "draft" ? "is-draft" : ""}">${content}</span>`;
        }).join("")}</div>
      </div>
      <div class="article-date"><strong>${escapeHtml(article.date)}</strong><small>${article.destinations?.length ? `${article.destinations.length} saved destination${article.destinations.length === 1 ? "" : "s"}` : "Not yet sent"}</small></div>
    </article>
  `).join("");
  elements.emptyState.hidden = articles.length > 0;
  elements.articleCount.textContent = String(state.articles.length);
  elements.readyCount.textContent = String(state.articles.filter(article => article.status === "ready").length);
  elements.selectAll.checked = articles.length > 0 && articles.every(article => state.selected.has(article.id));
  elements.selectAll.indeterminate = articles.some(article => state.selected.has(article.id)) && !elements.selectAll.checked;
  renderSelection();
}

function renderSelection() {
  const count = state.selected.size;
  elements.selectedCount.textContent = String(count);
  elements.stickyCount.textContent = count === 1 ? "1 article" : `${count} articles`;
  elements.reviewButton.disabled = count === 0;
  elements.saveDraftButton.disabled = count === 0;
  elements.selectionBubbles.innerHTML = [...state.selected].slice(0, 3).map(id => {
    const article = articleById(id);
    return article ? `<i style="background-image:url('${escapeHtml(article.image)}')"></i>` : "";
  }).join("");
}

function renderPreview(article) {
  if (!article) {
    elements.previewCover.style.backgroundImage = "";
    elements.previewCover.innerHTML = '<span class="preview-state">Select an article</span>';
    elements.previewLabels.innerHTML = "";
    elements.previewTitle.textContent = "Your rendered article appears here.";
    elements.previewMeta.textContent = "Title, date, labels and publication state are checked before anything is sent.";
    elements.previewExcerpt.textContent = "";
    return;
  }
  elements.previewCover.style.backgroundImage = `url("${article.image}")`;
  elements.previewCover.innerHTML = `<span class="preview-state">${escapeHtml(article.statusLabel)}</span>`;
  elements.previewLabels.innerHTML = article.labels.map(label => `<span class="mini-tag">${escapeHtml(label)}</span>`).join("");
  elements.previewTitle.textContent = article.title;
  const destinationLinks = (article.destinations || []).filter(item => item.url).map(item => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.providerLabel)} copy ↗</a>`).join(" · ");
  elements.previewMeta.innerHTML = `${escapeHtml(article.date)} · ${article.labels.length} labels · <a href="${escapeHtml(article.canonicalUrl || "https://rausr.com/")}" target="_blank" rel="noopener">Original on rausr.com ↗</a>${destinationLinks ? ` · ${destinationLinks}` : ""}`;
  elements.previewExcerpt.textContent = article.excerpt;
}

function toggleSelection(id, selected) {
  if (selected) state.selected.add(id); else state.selected.delete(id);
  renderArticles();
}

function selectPreview(id) {
  state.previewId = id;
  renderPreview(articleById(id));
  renderArticles();
}

function showView(name) {
  document.querySelectorAll("[data-view-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.viewPanel === name));
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("is-active", button.dataset.view === name));
  elements.viewTitle.textContent = name[0].toUpperCase() + name.slice(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message, success = true) {
  elements.toast.querySelector("span").textContent = success ? "✓" : "!";
  elements.toastText.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
}

function openReview(forcedMode) {
  if (!state.selected.size) return;
  elements.reviewSummary.innerHTML = [...state.selected].map(id => articleById(id)).filter(Boolean).map(article => `
    <div class="review-item"><img src="${escapeHtml(article.image)}" alt=""><div><strong>${escapeHtml(article.title)}</strong><small>${escapeHtml(article.date)} · ${article.labels.length} labels</small></div><span>${escapeHtml(article.statusLabel)}</span></div>
  `).join("");
  if (forcedMode) {
    const radio = document.querySelector(`input[name="publishMode"][value="${forcedMode}"]`);
    if (radio) { radio.checked = true; updateRadioCards(); }
  }
  const providerName = state.configuration.activeProvider === "facebook" ? "Facebook" : (state.configuration.activeProvider === "linkedin" ? "LinkedIn" : (state.configuration.activeProvider === "medium" ? "Medium" : "Blogger"));
  elements.reviewDestinationText.textContent = `One last calm check before ${providerName} changes.`;
  const linkedin = state.configuration.activeProvider === "linkedin";
  const facebook = state.configuration.activeProvider === "facebook";
  const assistedMedium = state.configuration.activeProvider === "medium" && state.configuration.mediumPublishingMode !== "api";
  elements.reviewSafetyText.innerHTML = facebook
    ? (state.configuration.facebookPublishingMode === "api"
      ? "<strong>Direct Graph API mode.</strong> Confirming will publish to the configured Facebook Page using its saved Page access token."
      : "<strong>Review stays in your hands.</strong> Rausr prepares concise copy, the source link, hashtags and header image; you confirm the final Page post on Facebook.")
    : linkedin
    ? "<strong>Review stays in your hands.</strong> Rausr prepares concise copy, the source link, focused hashtags and header image; you confirm the final Page post on LinkedIn."
    : assistedMedium
    ? "<strong>Partial edition.</strong> About 70% of the article is copied as rich content. Set the supplied Rausr URL as canonical in Medium’s Advanced Settings before publishing."
    : state.configuration.activeProvider === "medium"
    ? "<strong>Partial edition + canonical.</strong> Medium receives about 70% of each article and its canonical URL; already mapped articles are skipped."
    : "<strong>Partial edition + original link.</strong> Blogger receives about 70% of each article, a continuation link, and the Rausr URL as its title link.";
  elements.reviewDialog.showModal();
}

function updateRadioCards() {
  document.querySelectorAll(".radio-card").forEach(card => card.classList.toggle("is-selected", card.querySelector("input").checked));
}

function renderActivity(items = []) {
  const activity = items.length ? items : [
    { title: "Publisher interface is ready", detail: "Waiting for the first publication", time: "Now", icon: "✓" },
    { title: "Hugo rendering engine detected", detail: "Custom shortcodes and root-relative images supported", time: "Today", icon: "↻" }
  ];
  elements.activityList.innerHTML = activity.map(item => {
    const content = `<strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small>`;
    return `<div class="activity-row ${item.provider === "medium" ? "is-medium" : ""} ${item.provider === "linkedin" ? "is-linkedin" : ""} ${item.provider === "facebook" ? "is-facebook" : ""} ${item.status === "failed" ? "is-failed" : ""}"><span class="activity-icon">${escapeHtml(item.icon || "✓")}</span><div>${item.url ? `<a class="activity-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${content}</a>` : content}</div><span class="activity-time">${escapeHtml(item.time)}</span></div>`;
  }).join("");
}

function populateMediumTargets(targets = state.mediumTargets) {
  state.mediumTargets = targets;
  if (targets.length) {
    elements.mediumTargetSelect.innerHTML = targets.map(target => `<option value="${escapeHtml(`${target.type}:${target.id}`)}">${escapeHtml(target.name)} · ${escapeHtml(target.type === "publication" ? "Publication" : "Profile")}</option>`).join("");
  } else if (state.configuration.mediumTargetId) {
    const value = `${state.configuration.mediumTargetType || "user"}:${state.configuration.mediumTargetId}`;
    elements.mediumTargetSelect.innerHTML = `<option value="${escapeHtml(value)}">${escapeHtml(state.configuration.mediumTargetName || state.configuration.mediumUserName || "Medium")}</option>`;
  }
  const selected = `${state.configuration.mediumTargetType || "user"}:${state.configuration.mediumTargetId || ""}`;
  if ([...elements.mediumTargetSelect.options].some(option => option.value === selected)) elements.mediumTargetSelect.value = selected;
}

function setActiveProvider(provider, persist = false) {
  state.configuration.activeProvider = ["blogger", "medium", "linkedin", "facebook"].includes(provider) ? provider : "blogger";
  document.querySelectorAll(".provider-option").forEach(button => {
    const active = button.dataset.provider === state.configuration.activeProvider;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });
  const medium = state.configuration.activeProvider === "medium";
  const linkedin = state.configuration.activeProvider === "linkedin";
  const facebook = state.configuration.activeProvider === "facebook";
  const assistedMedium = medium && state.configuration.mediumPublishingMode !== "api";
  elements.heroDestinationLabel.textContent = facebook ? "Hugo → Facebook" : (linkedin ? "Hugo → LinkedIn" : (medium ? "Hugo → Medium" : "Hugo → Blogger"));
  elements.publishModeTitle.textContent = facebook || linkedin ? "Publish Page post" : (medium ? "Publish publicly" : "Publish or schedule");
  elements.publishModeDescription.textContent = facebook
    ? (state.configuration.facebookPublishingMode === "api" ? "Publish directly through Meta Graph API" : "Open the Rausr Page with prepared copy")
    : (linkedin ? "Open the Rausr Page with prepared copy" : (assistedMedium ? "Finish publishing in Medium" : (medium ? "Create a public Medium story" : "Use article dates immediately")));
  const publishLabel = facebook
    ? (state.configuration.facebookPublishingMode === "api" ? "Publish to Facebook" : "Prepare Facebook post")
    : (linkedin ? "Prepare LinkedIn post" : (assistedMedium ? "Prepare Medium excerpt" : `Publish to ${medium ? "Medium" : "Blogger"}`));
  elements.publishButton.innerHTML = `${publishLabel} <span>→</span>`;
  if (persist) {
    browser.storage.local.set({ publisherConfiguration: state.configuration });
    RausrNative.request("saveConfiguration", { configuration: { activeProvider: state.configuration.activeProvider } });
  }
}

function setMediumPublishingMode(mode, persist = false) {
  state.configuration.mediumPublishingMode = mode === "api" ? "api" : "import";
  const usingAPI = state.configuration.mediumPublishingMode === "api";
  elements.mediumModeImport.classList.toggle("is-active", !usingAPI);
  elements.mediumModeToken.classList.toggle("is-active", usingAPI);
  elements.mediumModeImport.setAttribute("aria-checked", String(!usingAPI));
  elements.mediumModeToken.setAttribute("aria-checked", String(usingAPI));
  elements.mediumTokenFields.hidden = !usingAPI;
  elements.mediumTargetSelect.disabled = !usingAPI;
  setActiveProvider(state.configuration.activeProvider);
  if (persist) {
    browser.storage.local.set({ publisherConfiguration: state.configuration });
    RausrNative.request("saveConfiguration", { configuration: { mediumPublishingMode: state.configuration.mediumPublishingMode } });
  }
}

function setFacebookPublishingMode(mode, persist = false) {
  state.configuration.facebookPublishingMode = mode === "api" ? "api" : "assisted";
  const usingAPI = state.configuration.facebookPublishingMode === "api";
  elements.facebookModeAssisted.classList.toggle("is-active", !usingAPI);
  elements.facebookModeAPI.classList.toggle("is-active", usingAPI);
  elements.facebookModeAssisted.setAttribute("aria-checked", String(!usingAPI));
  elements.facebookModeAPI.setAttribute("aria-checked", String(usingAPI));
  elements.facebookAPIFields.hidden = !usingAPI;
  setActiveProvider(state.configuration.activeProvider);
  if (persist) {
    browser.storage.local.set({ publisherConfiguration: state.configuration });
    RausrNative.request("saveConfiguration", { configuration: { facebookPublishingMode: state.configuration.facebookPublishingMode } });
  }
}

function populateSettings() {
  const config = state.configuration;
  elements.projectPath.value = config.projectPath || "";
  const mediumConnection = config.mediumPublishingMode === "import" ? "Medium assisted excerpt" : config.mediumUserName;
  const facebookConnection = config.facebookPublishingMode === "api" && config.facebookPageId
    ? `Facebook · ${config.facebookPageName || config.facebookPageId}`
    : (config.facebookPageURL ? "Facebook · Rausr" : "");
  const connected = [config.blogName, mediumConnection, config.linkedinCompanyURL ? "LinkedIn · Rausr" : "", facebookConnection].filter(Boolean);
  elements.profileBlog.textContent = connected.length ? connected.join(" + ") : "No destinations connected";
  elements.oauthClientInput.value = config.oauthClientPath || "";
  if (config.blogId && ![...elements.blogSelect.options].some(option => option.value === config.blogId)) {
    elements.blogSelect.innerHTML = `<option value="${escapeHtml(config.blogId)}">${escapeHtml(config.blogName || config.blogId)}</option>`;
  }
  elements.blogSelect.value = config.blogId || "";
  elements.mediumTokenInput.value = "";
  elements.mediumTokenInput.placeholder = config.mediumTokenPath ? "Connected token saved securely" : "Paste an existing Medium token";
  elements.linkedinCompanyURL.value = config.linkedinCompanyURL || "https://www.linkedin.com/company/rausr/";
  elements.facebookPageURL.value = config.facebookPageURL || "https://www.facebook.com/rausrdotcom/";
  elements.facebookPageId.value = config.facebookPageId || "";
  elements.facebookTokenInput.value = "";
  elements.facebookTokenInput.placeholder = config.facebookTokenPath ? "Page token saved securely" : "Paste a Page access token";
  populateMediumTargets();
  elements.timezoneSelect.value = config.timezone;
  elements.publishTimeInput.value = config.publishTime;
  elements.headerImageToggle.checked = config.includeHeaderImage;
  elements.confirmationToggle.checked = config.confirmBeforePublish;
  setActiveProvider(config.activeProvider || "blogger");
  setMediumPublishingMode(config.mediumPublishingMode || (config.mediumTokenPath ? "api" : "import"));
  setFacebookPublishingMode(config.facebookPublishingMode || (config.facebookTokenPath ? "api" : "assisted"));
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (_) {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }
}

function htmlToPlainText(value) {
  const documentValue = new DOMParser().parseFromString(value, "text/html");
  return (documentValue.body.innerText || documentValue.body.textContent || "").trim();
}

async function copyRichText(value) {
  const plain = htmlToPlainText(value);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const item = new ClipboardItem({
        "text/html": new Blob([value], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" })
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (_) {
    // Safari may decline rich clipboard access after an asynchronous native call.
  }
  return copyText(plain);
}

async function openCurrentMediumImport() {
  currentMediumImport = pendingMediumImports[0] || null;
  if (!currentMediumImport) {
    elements.mediumImportDialog.close();
    state.selected.clear();
    renderArticles();
    showToast("Medium import tracking complete.");
    return;
  }
  elements.mediumImportTitle.textContent = currentMediumImport.title;
  elements.mediumImportSource.value = currentMediumImport.canonicalUrl;
  elements.mediumStoryURL.value = "";
  await copyRichText(currentMediumImport.contentHtml);
  await browser.tabs.create({ url: "https://medium.com/new-story" });
  if (!elements.mediumImportDialog.open) elements.mediumImportDialog.showModal();
}

async function beginMediumImports(imports) {
  pendingMediumImports = Array.isArray(imports) ? [...imports] : [];
  await openCurrentMediumImport();
}

async function recordCurrentMediumImport(status) {
  if (!currentMediumImport) return;
  const response = await RausrNative.request("recordMediumImport", {
    articleId: currentMediumImport.articleId,
    status,
    url: elements.mediumStoryURL.value.trim()
  });
  if (!response?.ok) {
    showToast(response?.error || "Could not record the Medium import.", false);
    return;
  }
  if (Array.isArray(response.articles)) state.articles = response.articles;
  if (Array.isArray(response.activity)) { state.activity = response.activity; renderActivity(state.activity); }
  pendingMediumImports.shift();
  renderArticles();
  await openCurrentMediumImport();
}

async function openCurrentLinkedInPost() {
  currentLinkedInPost = pendingLinkedInPosts[0] || null;
  if (!currentLinkedInPost) {
    elements.linkedinPostDialog.close();
    state.selected.clear();
    renderArticles();
    showToast("LinkedIn post tracking complete.");
    return;
  }
  elements.linkedinPostTitle.textContent = currentLinkedInPost.title;
  elements.linkedinPostCopy.value = currentLinkedInPost.postText;
  elements.linkedinPostURL.value = "";
  elements.linkedinHeaderPreview.src = currentLinkedInPost.headerImage || "";
  elements.linkedinHeaderPreview.hidden = !currentLinkedInPost.headerImage;
  elements.openLinkedInImageButton.disabled = !currentLinkedInPost.headerImage;
  await copyText(currentLinkedInPost.postText);
  await browser.tabs.create({ url: currentLinkedInPost.companyURL || "https://www.linkedin.com/company/rausr/" });
  if (!elements.linkedinPostDialog.open) elements.linkedinPostDialog.showModal();
}

async function beginLinkedInPosts(posts) {
  pendingLinkedInPosts = Array.isArray(posts) ? [...posts] : [];
  await openCurrentLinkedInPost();
}

async function recordCurrentLinkedInPost(status) {
  if (!currentLinkedInPost) return;
  const response = await RausrNative.request("recordLinkedInPost", {
    articleId: currentLinkedInPost.articleId,
    status,
    url: elements.linkedinPostURL.value.trim()
  });
  if (!response?.ok) {
    showToast(response?.error || "Could not record the LinkedIn post.", false);
    return;
  }
  if (Array.isArray(response.articles)) state.articles = response.articles;
  if (Array.isArray(response.activity)) { state.activity = response.activity; renderActivity(state.activity); }
  pendingLinkedInPosts.shift();
  renderArticles();
  await openCurrentLinkedInPost();
}

async function openCurrentFacebookPost() {
  currentFacebookPost = pendingFacebookPosts[0] || null;
  if (!currentFacebookPost) {
    elements.facebookPostDialog.close();
    state.selected.clear();
    renderArticles();
    showToast("Facebook post tracking complete.");
    return;
  }
  elements.facebookPostTitle.textContent = currentFacebookPost.title;
  elements.facebookPostCopy.value = currentFacebookPost.postText;
  elements.facebookPostURL.value = "";
  elements.facebookHeaderPreview.src = currentFacebookPost.headerImage || "";
  elements.facebookHeaderPreview.hidden = !currentFacebookPost.headerImage;
  elements.openFacebookImageButton.disabled = !currentFacebookPost.headerImage;
  await copyText(currentFacebookPost.postText);
  await browser.tabs.create({ url: currentFacebookPost.pageURL || "https://www.facebook.com/rausrdotcom/" });
  if (!elements.facebookPostDialog.open) elements.facebookPostDialog.showModal();
}

async function beginFacebookPosts(posts) {
  pendingFacebookPosts = Array.isArray(posts) ? [...posts] : [];
  await openCurrentFacebookPost();
}

async function recordCurrentFacebookPost(status) {
  if (!currentFacebookPost) return;
  const response = await RausrNative.request("recordFacebookPost", {
    articleId: currentFacebookPost.articleId,
    status,
    url: elements.facebookPostURL.value.trim()
  });
  if (!response?.ok) {
    showToast(response?.error || "Could not record the Facebook post.", false);
    return;
  }
  if (Array.isArray(response.articles)) state.articles = response.articles;
  if (Array.isArray(response.activity)) { state.activity = response.activity; renderActivity(state.activity); }
  pendingFacebookPosts.shift();
  renderArticles();
  await openCurrentFacebookPost();
}

async function loadInitialState() {
  const stored = await browser.storage.local.get(["publisherConfiguration", "onboardingComplete"]);
  if (stored.publisherConfiguration) Object.assign(state.configuration, stored.publisherConfiguration);

  const response = await RausrNative.request("bootstrap");
  state.companionAvailable = Boolean(response?.ok && response?.companionAvailable);
  if (state.companionAvailable) {
    Object.assign(state.configuration, response.configuration || {});
    state.articles = Array.isArray(response.articles) ? response.articles : [];
    state.activity = Array.isArray(response.activity) ? response.activity : [];
    elements.connectionCard.classList.add("is-online");
    elements.connectionTitle.textContent = "Companion connected";
    elements.connectionText.textContent = response.hugoVersion || "Native bridge ready";
  } else {
    state.articles = DEMO_ARTICLES;
    elements.connectionTitle.textContent = "Interface preview";
    elements.connectionText.textContent = "Companion setup required";
  }

  populateSettings();
  renderArticles();
  renderActivity(state.activity.length ? state.activity : response?.activity);
  if (state.articles.length) selectPreview(state.articles[0].id);

  const shouldWelcome = location.hash === "#welcome" || !stored.onboardingComplete;
  if (shouldWelcome) elements.onboardingDialog.showModal();
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll(".provider-option").forEach(button => button.addEventListener("click", () => {
  setActiveProvider(button.dataset.provider, true);
  const name = button.dataset.provider === "facebook" ? "Facebook" : (button.dataset.provider === "linkedin" ? "LinkedIn" : (button.dataset.provider === "medium" ? "Medium" : "Blogger"));
  showToast(`${name} selected.`);
}));
document.querySelectorAll(".filter-button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter-button").forEach(item => item.classList.remove("is-active"));
  button.classList.add("is-active");
  state.filter = button.dataset.filter;
  renderArticles();
}));

elements.searchInput.addEventListener("input", event => { state.search = event.target.value; renderArticles(); });
elements.articleList.addEventListener("click", event => {
  if (event.target.closest("a")) return;
  const row = event.target.closest(".article-row");
  if (!row) return;
  const id = row.dataset.articleId;
  if (event.target.closest(".check-control")) {
    const checkbox = row.querySelector("input[type=checkbox]");
    setTimeout(() => toggleSelection(id, checkbox.checked), 0);
  } else {
    selectPreview(id);
  }
});
elements.selectAll.addEventListener("change", event => {
  visibleArticles().forEach(article => event.target.checked ? state.selected.add(article.id) : state.selected.delete(article.id));
  renderArticles();
});
document.getElementById("clearSelection").addEventListener("click", () => { state.selected.clear(); renderArticles(); });
document.getElementById("closePreviewButton").addEventListener("click", () => { state.previewId = null; renderPreview(null); renderArticles(); });
document.getElementById("openPreviewButton").addEventListener("click", () => state.previewId && showToast("Full rendered HTML preview will open through the companion."));
elements.reviewButton.addEventListener("click", () => openReview());
elements.saveDraftButton.addEventListener("click", () => openReview("draft"));
document.getElementById("quickPublishButton").addEventListener("click", () => document.getElementById("articleSection").scrollIntoView({ behavior: "smooth" }));
document.getElementById("heroChooseButton").addEventListener("click", () => document.getElementById("articleSection").scrollIntoView({ behavior: "smooth" }));
document.getElementById("profileButton").addEventListener("click", () => showView("settings"));
document.querySelectorAll(".step").forEach(step => step.addEventListener("click", () => {
  if (step.dataset.step === "connect") showView("settings");
  if (step.dataset.step === "choose") document.getElementById("articleSection").scrollIntoView({ behavior: "smooth" });
  if (step.dataset.step === "review") openReview();
  if (step.dataset.step === "publish") openReview("publish");
}));
document.querySelectorAll('input[name="publishMode"]').forEach(input => input.addEventListener("change", updateRadioCards));
elements.mediumModeImport.addEventListener("click", () => { setMediumPublishingMode("import", true); showToast("Medium assisted excerpt selected."); });
elements.mediumModeToken.addEventListener("click", () => { setMediumPublishingMode("api", true); showToast("Legacy Medium API selected."); });
elements.copyMediumSourceButton.addEventListener("click", async () => showToast(await copyText(elements.mediumImportSource.value) ? "Original URL copied." : "Copy the URL manually.", true));
elements.copyMediumExcerptButton.addEventListener("click", async () => showToast(await copyRichText(currentMediumImport?.contentHtml || "") ? "Medium excerpt copied with formatting." : "Copy the excerpt manually."));
elements.markMediumDraft.addEventListener("click", () => recordCurrentMediumImport("draft"));
elements.markMediumPublished.addEventListener("click", () => recordCurrentMediumImport("published"));
elements.copyLinkedInPostButton.addEventListener("click", async () => showToast(await copyText(elements.linkedinPostCopy.value) ? "LinkedIn post copied." : "Copy the post manually."));
elements.openLinkedInImageButton.addEventListener("click", () => currentLinkedInPost?.headerImage && browser.tabs.create({ url: currentLinkedInPost.headerImage }));
elements.markLinkedInDraft.addEventListener("click", () => recordCurrentLinkedInPost("draft"));
elements.markLinkedInPublished.addEventListener("click", () => recordCurrentLinkedInPost("published"));
elements.facebookModeAssisted.addEventListener("click", () => { setFacebookPublishingMode("assisted", true); showToast("Facebook assisted publishing selected."); });
elements.facebookModeAPI.addEventListener("click", () => { setFacebookPublishingMode("api", true); showToast("Facebook Graph API selected."); });
elements.copyFacebookPostButton.addEventListener("click", async () => showToast(await copyText(elements.facebookPostCopy.value) ? "Facebook post copied." : "Copy the post manually."));
elements.openFacebookImageButton.addEventListener("click", () => currentFacebookPost?.headerImage && browser.tabs.create({ url: currentFacebookPost.headerImage }));
elements.markFacebookDraft.addEventListener("click", () => recordCurrentFacebookPost("draft"));
elements.markFacebookPublished.addEventListener("click", () => recordCurrentFacebookPost("published"));

document.getElementById("refreshButton").addEventListener("click", async () => {
  const response = await RausrNative.request("listArticles", { projectPath: state.configuration.projectPath });
  if (response?.ok && Array.isArray(response.articles)) {
    state.articles = response.articles;
    if (Array.isArray(response.activity)) { state.activity = response.activity; renderActivity(state.activity); }
    renderArticles();
    showToast("Articles refreshed.");
  } else {
    showToast(state.companionAvailable ? response?.error || "Could not refresh articles." : "Companion will enable live refreshing; showing interface preview.", false);
  }
});

document.getElementById("chooseFolderButton").addEventListener("click", async () => {
  const requestedPath = elements.projectPath.value.trim();
  const response = await RausrNative.request("chooseProject", { projectPath: requestedPath });
  if (response?.ok && response.projectPath) {
    state.configuration.projectPath = response.projectPath;
    elements.projectPath.value = response.projectPath;
    elements.hugoStatus.textContent = response.hugoVersion || "Valid Hugo project";
    if (Array.isArray(response.articles)) {
      state.articles = response.articles;
      state.selected.clear();
      renderArticles();
      if (state.articles.length) selectPreview(state.articles[0].id);
    }
    if (Array.isArray(response.activity)) { state.activity = response.activity; renderActivity(state.activity); }
    showToast("Hugo project connected.");
  } else {
    showToast(response?.error || "The native companion will open the folder picker.", false);
  }
});

elements.oauthClientFileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  pendingOAuthClientJSON = await file.text();
  elements.oauthClientInput.value = file.name;
  showToast("OAuth client file selected. Connect Google to save it locally.");
});

document.getElementById("googleConnectButton").addEventListener("click", async () => {
  state.configuration.oauthClientPath = elements.oauthClientInput.value.trim();
  const response = await RausrNative.request("authorizeGoogle", { configuration: state.configuration, oauthClientJSON: pendingOAuthClientJSON });
  if (response?.ok && response.blogs) {
    pendingOAuthClientJSON = "";
    if (response.oauthClientPath) {
      state.configuration.oauthClientPath = response.oauthClientPath;
      elements.oauthClientInput.value = response.oauthClientPath;
    }
    elements.blogSelect.innerHTML = response.blogs.map(blog => `<option value="${escapeHtml(blog.id)}">${escapeHtml(blog.name)}</option>`).join("");
    showToast("Google account connected.");
  } else {
    showToast(response?.error || "The companion will complete secure Google sign-in.", false);
  }
});

document.getElementById("mediumConnectButton").addEventListener("click", async () => {
  const token = elements.mediumTokenInput.value.trim();
  const response = await RausrNative.request("connectMedium", { token });
  if (response?.ok && Array.isArray(response.targets)) {
    Object.assign(state.configuration, response.configuration || {});
    state.configuration.mediumPublishingMode = "api";
    populateMediumTargets(response.targets);
    elements.mediumTokenInput.value = "";
    elements.mediumTokenInput.placeholder = "Connected token saved securely";
    populateSettings();
    showToast("Medium account connected.");
  } else {
    showToast(response?.error || "Medium could not be connected.", false);
  }
});

elements.facebookConnectButton.addEventListener("click", async () => {
  const token = elements.facebookTokenInput.value.trim();
  const response = await RausrNative.request("connectFacebook", {
    token,
    pageId: elements.facebookPageId.value.trim(),
    pageURL: elements.facebookPageURL.value.trim()
  });
  if (response?.ok) {
    Object.assign(state.configuration, response.configuration || {});
    state.configuration.facebookPublishingMode = "api";
    elements.facebookTokenInput.value = "";
    elements.facebookTokenInput.placeholder = "Page token saved securely";
    populateSettings();
    showToast(`Facebook Page connected${response.pageName ? ` · ${response.pageName}` : ""}.`);
  } else {
    showToast(response?.error || "Facebook could not be connected.", false);
  }
});

document.getElementById("saveSettingsButton").addEventListener("click", async () => {
  Object.assign(state.configuration, {
    projectPath: elements.projectPath.value.trim(),
    oauthClientPath: elements.oauthClientInput.value.trim(),
    blogId: elements.blogSelect.value,
    blogName: elements.blogSelect.selectedOptions[0]?.textContent || state.configuration.blogName,
    mediumTargetType: elements.mediumTargetSelect.value.split(":", 1)[0] || state.configuration.mediumTargetType,
    mediumTargetId: elements.mediumTargetSelect.value.includes(":") ? elements.mediumTargetSelect.value.slice(elements.mediumTargetSelect.value.indexOf(":") + 1) : state.configuration.mediumTargetId,
    mediumTargetName: elements.mediumTargetSelect.selectedOptions[0]?.textContent || state.configuration.mediumTargetName,
    linkedinCompanyURL: elements.linkedinCompanyURL.value.trim() || "https://www.linkedin.com/company/rausr/",
    facebookPublishingMode: state.configuration.facebookPublishingMode,
    facebookPageURL: elements.facebookPageURL.value.trim() || "https://www.facebook.com/rausrdotcom/",
    facebookPageId: elements.facebookPageId.value.trim(),
    timezone: elements.timezoneSelect.value,
    publishTime: elements.publishTimeInput.value,
    includeHeaderImage: elements.headerImageToggle.checked,
    confirmBeforePublish: elements.confirmationToggle.checked
  });
  await browser.storage.local.set({ publisherConfiguration: state.configuration, onboardingComplete: true });
  const response = await RausrNative.request("saveConfiguration", { configuration: state.configuration });
  elements.settingsMessage.textContent = response?.ok ? "Saved to the native companion." : "Saved in Safari; companion sync is pending.";
  populateSettings();
  showToast("Settings saved.");
});

elements.reviewForm.addEventListener("submit", async event => {
  if (event.submitter?.value !== "default") return;
  event.preventDefault();
  const mode = new FormData(elements.reviewForm).get("publishMode");
  elements.publishButton.disabled = true;
  elements.publishButton.textContent = "Publishing…";
  const response = await RausrNative.request("publish", { articleIds: [...state.selected], mode, provider: state.configuration.activeProvider });
  elements.publishButton.disabled = false;
  setActiveProvider(state.configuration.activeProvider);
  if (response?.ok) {
    elements.reviewDialog.close();
    if (response.assistedImport) {
      await beginMediumImports(response.imports || []);
      return;
    }
    if (response.assistedLinkedIn) {
      await beginLinkedInPosts(response.posts || []);
      return;
    }
    if (response.assistedFacebook) {
      await beginFacebookPosts(response.posts || []);
      return;
    }
    state.selected.clear();
    if (Array.isArray(response.articles)) state.articles = response.articles;
    if (Array.isArray(response.activity)) { state.activity = response.activity; renderActivity(state.activity); }
    renderArticles();
    showToast(response.message || "Publication complete.");
  } else {
    showToast(response?.error || "Connect the companion before publishing.", false);
  }
});

document.getElementById("startSetupButton").addEventListener("click", async () => {
  elements.onboardingDialog.close();
  await browser.storage.local.set({ onboardingComplete: true });
  showView("settings");
});
document.getElementById("onboardingClose").addEventListener("click", () => elements.onboardingDialog.close());

loadInitialState();

document.addEventListener("DOMContentLoaded", () => {
  const article = document.querySelector(".article-container");
  const body = article?.querySelector(".article-left-column");
  const sidebar = article?.querySelector(".article-right-toc");
  const inline = article?.querySelector(".article-inline-toc");
  const mobileProgress = document.querySelector(".article-mobile-progress");
  if (!article || !body) return;

  const mobile = window.matchMedia("(max-width: 575px)");
  const details = [sidebar, inline].filter(Boolean);
  const setDefaultState = () => {
    for (const panel of details) panel.open = !mobile.matches;
  };
  setDefaultState();
  mobile.addEventListener("change", setDefaultState);

  const tocLinks = Array.from(article.querySelectorAll('.article-right-toc nav a[href^="#"], .article-inline-toc nav a[href^="#"]'));
  const primaryLinks = Array.from((sidebar || inline)?.querySelectorAll('nav a[href^="#"]') || []);
  const sections = primaryLinks
    .map((link) => ({ id: decodeURIComponent(link.hash.slice(1)) }))
    .map(({ id }) => ({ id, heading: document.getElementById(id) }))
    .filter(({ heading }) => heading && body.contains(heading));

  let frame = null;
  const update = () => {
    frame = null;
    const readingLine = window.scrollY + Math.min(window.innerHeight * 0.2, 160);
    const start = (sections[0]?.heading || body).getBoundingClientRect().top + window.scrollY;
    const end = body.getBoundingClientRect().bottom + window.scrollY;
    const percent = Math.round(Math.max(0, Math.min(1, (readingLine - start) / Math.max(end - start, 1))) * 100);

    for (const tree of article.querySelectorAll('.article-right-toc nav > ul, .article-inline-toc nav > ul')) {
      tree.style.setProperty("--article-toc-progress", `${percent}%`);
    }
    for (const label of article.querySelectorAll(".article-toc-progress")) {
      label.textContent = `${percent}%`;
      label.setAttribute("aria-valuenow", String(percent));
    }
    if (mobileProgress) {
      mobileProgress.style.setProperty("--article-toc-progress", `${percent}%`);
      mobileProgress.querySelector(".article-mobile-progress__value").textContent = `${percent}%`;
      mobileProgress.setAttribute("aria-valuenow", String(percent));
      const bounds = article.getBoundingClientRect();
      const visible = mobile.matches && bounds.top < window.innerHeight * 0.85 && bounds.bottom > window.innerHeight * 0.15;
      mobileProgress.classList.toggle("is-visible", visible);
      mobileProgress.setAttribute("aria-hidden", String(!visible));
    }

    let currentId = null;
    for (const section of sections) {
      if (section.heading.getBoundingClientRect().top + window.scrollY <= readingLine) currentId = section.id;
      else break;
    }
    for (const link of tocLinks) {
      const active = currentId !== null && decodeURIComponent(link.hash.slice(1)) === currentId;
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
      link.parentElement?.classList.toggle("is-current-section", active);
    }
  };

  const scheduleUpdate = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("load", scheduleUpdate, { once: true });
});

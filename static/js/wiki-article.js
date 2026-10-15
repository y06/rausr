document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".wiki-article-sidebar");
  const prose = document.querySelector(".wiki-prose");
  const tree = sidebar?.querySelector("nav > ul");
  const progressLabel = sidebar?.querySelector(".wiki-sidebar-progress");
  const mobileProgress = document.querySelector(".wiki-mobile-progress");
  const article = document.querySelector(".wiki-article");
  const mobile = window.matchMedia("(max-width: 575px)");

  if (prose) {
    for (const heading of prose.querySelectorAll(":scope > h3")) {
      const subsection = document.createElement("div");
      subsection.className = "wiki-prose__subsection";
      heading.before(subsection);

      let node = heading;
      while (node && (node === heading || !node.matches("h2, h3"))) {
        const next = node.nextElementSibling;
        subsection.append(node);
        node = next;
      }
    }
  }

  if (!tree || !prose || !progressLabel) return;

  const sections = Array.from(tree.querySelectorAll('a[href^="#"]'))
    .map((link) => {
      const id = decodeURIComponent(link.hash.slice(1));
      return { link, heading: document.getElementById(id) };
    })
    .filter(({ heading }) => heading && prose.contains(heading));

  if (!sections.length) return;

  let activeLink = null;
  let frame = null;

  const update = () => {
    frame = null;
    const readingLine = window.scrollY + Math.min(window.innerHeight * 0.2, 160);
    const first = sections[0].heading.getBoundingClientRect().top + window.scrollY;
    const end = prose.getBoundingClientRect().bottom + window.scrollY;
    const progress = Math.max(0, Math.min(1, (readingLine - first) / Math.max(end - first, 1)));
    const percent = Math.round(progress * 100);

    tree.style.setProperty("--wiki-toc-progress", `${percent}%`);
    progressLabel.textContent = `${percent}%`;
    progressLabel.setAttribute("aria-valuenow", String(percent));

    if (mobileProgress && article) {
      mobileProgress.style.setProperty("--article-toc-progress", `${percent}%`);
      mobileProgress.querySelector(".article-mobile-progress__value").textContent = `${percent}%`;
      mobileProgress.setAttribute("aria-valuenow", String(percent));
      const bounds = article.getBoundingClientRect();
      const visible = mobile.matches && bounds.top < window.innerHeight * 0.85 && bounds.bottom > window.innerHeight * 0.15;
      mobileProgress.classList.toggle("is-visible", visible);
      mobileProgress.setAttribute("aria-hidden", String(!visible));
    }

    let current = null;
    for (const section of sections) {
      if (section.heading.getBoundingClientRect().top + window.scrollY <= readingLine) {
        current = section.link;
      } else {
        break;
      }
    }

    if (current !== activeLink) {
      activeLink?.removeAttribute("aria-current");
      activeLink?.parentElement.classList.remove("is-current-section");
      current?.setAttribute("aria-current", "location");
      current?.parentElement.classList.add("is-current-section");
      activeLink = current;
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

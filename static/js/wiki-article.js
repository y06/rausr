document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".wiki-article-sidebar");
  const prose = document.querySelector(".wiki-prose");
  const tree = sidebar?.querySelector("nav > ul");
  const progressLabel = sidebar?.querySelector(".wiki-sidebar-progress");

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

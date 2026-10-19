document.addEventListener("DOMContentLoaded", () => {
  const profiles = Array.from(document.querySelectorAll("[data-wiki-designer]"));
  const form = document.querySelector(".wiki-designer-search");
  if (!profiles.length || !form) return;

  const input = form.querySelector("input");
  const status = form.querySelector('[role="status"]');
  const empty = document.querySelector(".wiki-designer-search__empty");
  const disclosures = Array.from(document.querySelectorAll(".wiki-designer-branch, .wiki-designer-profile"));
  const disclosureAnimations = new WeakMap();
  const normalise = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const searchable = profiles.map((profile) => ({
    profile,
    text: normalise(profile.dataset.search),
  }));

  const filter = () => {
    const terms = normalise(input.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const { profile, text } of searchable) {
      profile.hidden = !terms.every((term) => text.includes(term));
      if (!profile.hidden) count++;
    }
    status.textContent = `${count} of ${profiles.length} profiles`;
    empty.hidden = count > 0;
  };

  const rollerFor = (disclosure) => disclosure.querySelector(".wiki-designer-branch__roller, .wiki-designer-profile__roller");

  const setDisclosureOpen = (disclosure, open) => {
    const running = disclosureAnimations.get(disclosure);
    if (running) {
      running.height.cancel();
      running.fade.cancel();
      disclosureAnimations.delete(disclosure);
    }
    disclosure.open = open;
  };

  const animateDisclosure = (disclosure) => {
    const roller = rollerFor(disclosure);
    const running = disclosureAnimations.get(disclosure);
    const opening = running ? !running.opening : !disclosure.open;
    const startHeight = disclosure.open ? roller.getBoundingClientRect().height : 0;
    const startOpacity = disclosure.open ? Number.parseFloat(getComputedStyle(roller).opacity) : 0;

    if (running) {
      running.height.cancel();
      running.fade.cancel();
    }

    // Keep native details content in the layout until its closing animation finishes.
    disclosure.open = true;
    const endHeight = opening ? roller.scrollHeight : 0;
    const height = roller.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    const fade = roller.animate(
      [{ opacity: startOpacity }, { opacity: opening ? 1 : 0 }],
      { duration: 300, easing: "ease", fill: "forwards" }
    );
    disclosureAnimations.set(disclosure, { height, fade, opening });
    height.onfinish = () => {
      if (disclosureAnimations.get(disclosure)?.height !== height) return;
      disclosure.open = opening;
      fade.cancel();
      disclosureAnimations.delete(disclosure);
    };
  };

  disclosures.forEach((disclosure) => {
    disclosure.querySelector("summary").addEventListener("click", (event) => {
      event.preventDefault();
      animateDisclosure(disclosure);
    });
  });

  const openLinkedProfile = () => {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target?.hasAttribute("data-wiki-designer")) return;
    input.value = "";
    filter();
    setDisclosureOpen(target, true);
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  };

  form.hidden = false;
  form.addEventListener("submit", (event) => event.preventDefault());
  input.addEventListener("input", filter);
  form.addEventListener("reset", () => {
    input.value = "";
    filter();
    input.focus();
  });

  if (window.matchMedia("(max-width: 700px)").matches) {
    document.querySelectorAll(".wiki-designer-branch").forEach((branch) => { branch.open = false; });
  }
  filter();
  openLinkedProfile();
  window.addEventListener("hashchange", openLinkedProfile);
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && link.hash === window.location.hash) openLinkedProfile();
  });
});

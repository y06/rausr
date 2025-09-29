document.addEventListener("DOMContentLoaded", function () {
    const containers = document.querySelectorAll(".container-tag-list");

    containers.forEach((container) => {
        const tagListWrapper = container.querySelector(".tag-list-wrapper");
        const leftButton = container.querySelector(".tag-scroll.left");
        const rightButton = container.querySelector(".tag-scroll.right");

        if (!tagListWrapper || !leftButton || !rightButton) {
            return;
        }

        const getScrollStep = () => Math.max(tagListWrapper.clientWidth * 0.8, 200);

        const updateButtons = () => {
            const maxScrollLeft = tagListWrapper.scrollWidth - tagListWrapper.clientWidth;

            if (maxScrollLeft <= 0) {
                leftButton.style.visibility = "hidden";
                rightButton.style.visibility = "hidden";
                return;
            }

            leftButton.style.visibility = tagListWrapper.scrollLeft > 0 ? "visible" : "hidden";
            rightButton.style.visibility = tagListWrapper.scrollLeft >= maxScrollLeft - 1 ? "hidden" : "visible";
        };

        let animationFrameId = null;

        const smoothScrollTo = (target) => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            const start = tagListWrapper.scrollLeft;
            const change = target - start;
            if (change === 0) {
                updateButtons();
                return;
            }

            const duration = 350;
            const startTime = performance.now();

            const easeInOut = (t) => t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const step = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeInOut(progress);

                tagListWrapper.scrollLeft = start + change * easedProgress;
                updateButtons();

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(step);
                } else {
                    animationFrameId = null;
                }
            };

            animationFrameId = requestAnimationFrame(step);
        };

        const scrollByAmount = (direction) => {
            const amount = getScrollStep() * (direction === "right" ? 1 : -1);
            const maxScrollLeft = tagListWrapper.scrollWidth - tagListWrapper.clientWidth;
            const target = Math.max(0, Math.min(tagListWrapper.scrollLeft + amount, maxScrollLeft));
            smoothScrollTo(target);
        };

        leftButton.addEventListener("click", () => scrollByAmount("left"));
        rightButton.addEventListener("click", () => scrollByAmount("right"));

        tagListWrapper.addEventListener("scroll", () => window.requestAnimationFrame(updateButtons));
        window.addEventListener("resize", updateButtons);

        updateButtons();
    });

    const navSearchInput = document.getElementById("navbar-search-input");
    if (navSearchInput) {
        const dropdown = document.getElementById("navbar-search-dropdown");
        const resultsList = document.getElementById("navbar-search-results");
        const seeAllLink = document.getElementById("navbar-search-see-all");
        const searchBase = seeAllLink ? (seeAllLink.dataset.searchBase || seeAllLink.getAttribute("href") || "/search/") : "/search/";
        const baseHasQuery = searchBase.includes("?");
        let searchData = [];
        let searchPromise = null;

        const indexPath = navSearchInput.dataset.indexPath || "/index.json";

        const loadSearchData = () => {
            if (searchPromise) {
                return searchPromise;
            }
            searchPromise = fetch(indexPath, { cache: "no-store" })
                .then((resp) => (resp.ok ? resp.json() : []))
                .then((json) => {
                    searchData = Array.isArray(json) ? json : [];
                    return searchData;
                })
                .catch((err) => {
                    console.error("Search index failed", err);
                    searchData = [];
                    return searchData;
                });
            return searchPromise;
        };

        const closeDropdown = () => {
            if (dropdown.hasAttribute("hidden")) {
                return;
            }
            dropdown.setAttribute("hidden", "hidden");
            navSearchInput.setAttribute("aria-expanded", "false");
        };

        const renderResults = (items, query) => {
            resultsList.innerHTML = "";
            if (!items.length) {
                const empty = document.createElement("li");
                empty.className = "navbar-search__results-empty";
                empty.setAttribute("role", "presentation");
                empty.textContent = query ? "No matches yet" : "Type to search";
                resultsList.appendChild(empty);
            } else {
                items.forEach((item) => {
                    const li = document.createElement("li");
                    li.className = "navbar-search__item";
                    li.setAttribute("role", "option");

                    const link = document.createElement("a");
                    link.className = "navbar-search__link";
                    link.href = item.url;

                    const icon = document.createElement("span");
                    const sectionClass = item.section === "works" ? "works" : "blog";
                    icon.className = "navbar-search__icon navbar-search__icon--" + sectionClass;
                    icon.textContent = item.section === "works" ? "W" : "A";

                    const meta = document.createElement("span");
                    meta.className = "navbar-search__meta";

                    const title = document.createElement("span");
                    title.className = "navbar-search__title";
                    title.textContent = item.title;

                    const category = document.createElement("span");
                    category.className = "navbar-search__category navbar-search__category--" + sectionClass;
                    category.textContent = "in " + (item.section === "blog" ? "Articles" : "Works");

                    const arrow = document.createElement("span");
                    arrow.className = "navbar-search__arrow";
                    arrow.textContent = "\u2192";

                    meta.appendChild(title);
                    meta.appendChild(category);

                    link.appendChild(icon);
                    link.appendChild(meta);
                    link.appendChild(arrow);

                    li.appendChild(link);
                    resultsList.appendChild(li);
                });
            }

            if (seeAllLink) {
                const suffix = query ? (baseHasQuery ? "&q=" : "?q=") + encodeURIComponent(query) : "";
                seeAllLink.href = searchBase + suffix;
            }
        };

        const performSearch = (query) => {
            const trimmed = query.trim();
            if (!trimmed) {
                renderResults([], trimmed);
                dropdown.removeAttribute("hidden");
                navSearchInput.setAttribute("aria-expanded", "true");
                return;
            }

            const needle = trimmed.toLowerCase();
            const matches = searchData
                .filter((item) => {
                    const haystack = [
                        item.title || "",
                        item.description || "",
                        Array.isArray(item.tags) ? item.tags.join(" ") : ""
                    ].join(" ").toLowerCase();
                    return haystack.includes(needle);
                })
                .slice(0, 4);

            renderResults(matches, trimmed);
            dropdown.removeAttribute("hidden");
            navSearchInput.setAttribute("aria-expanded", "true");
        };

        const onInput = (event) => {
            const value = event.target.value;
            loadSearchData().then(() => {
                performSearch(value);
            });
        };

        navSearchInput.addEventListener("input", onInput);
        navSearchInput.addEventListener("focus", () => {
            if (!navSearchInput.value) {
                renderResults([], "");
            }
            dropdown.removeAttribute("hidden");
            navSearchInput.setAttribute("aria-expanded", "true");
            if (!searchPromise) {
                loadSearchData();
            }
        });

        navSearchInput.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeDropdown();
                navSearchInput.blur();
            }
        });

        document.addEventListener("click", (event) => {
            if (!dropdown.contains(event.target) && event.target !== navSearchInput) {
                closeDropdown();
            }
        });
    }
});

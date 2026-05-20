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

    const serviceSliders = document.querySelectorAll("[data-service-slider]");

    serviceSliders.forEach((slider) => {
        const viewport = slider.querySelector("[data-service-slider-viewport]");
        const cards = Array.from(slider.querySelectorAll("[data-service-slider-card]"));
        const prevButton = slider.querySelector("[data-service-slider-prev]");
        const nextButton = slider.querySelector("[data-service-slider-next]");
        const progressFill = slider.parentElement.querySelector("[data-service-slider-progress]");

        if (!viewport || !cards.length || !prevButton || !nextButton || !progressFill) {
            return;
        }

        let isDragging = false;
        let hasDragged = false;
        let dragStartX = 0;
        let dragStartScrollLeft = 0;
        let activePointerId = null;
        let lastPointerX = 0;
        let lastPointerTime = 0;
        let dragVelocity = 0;

        const getCardStep = () => {
            if (cards.length < 2) {
                return viewport.clientWidth;
            }
            return Math.max(cards[1].offsetLeft - cards[0].offsetLeft, cards[0].clientWidth);
        };

        const updateSliderState = () => {
            const maxScrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
            const currentScroll = Math.min(Math.max(viewport.scrollLeft, 0), maxScrollLeft);
            const progress = maxScrollLeft <= 0 ? 1 : currentScroll / maxScrollLeft;
            const minProgress = maxScrollLeft <= 0 ? 1 : 0.08;
            const displayProgress = minProgress + (1 - minProgress) * Math.max(0, Math.min(progress, 1));

            progressFill.style.transform = `scaleX(${displayProgress})`;
            prevButton.disabled = currentScroll <= 1;
            nextButton.disabled = currentScroll >= maxScrollLeft - 1;
            slider.classList.toggle("is-static", maxScrollLeft <= 0);
        };

        const scrollByCard = (direction) => {
            const maxScrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
            const step = getCardStep();
            const currentIndex = Math.round(viewport.scrollLeft / step);
            const targetIndex = Math.max(0, Math.min(currentIndex + direction, cards.length - 1));
            const target = Math.max(0, Math.min(cards[targetIndex].offsetLeft, maxScrollLeft));

            slider.classList.add("is-settling");
            viewport.scrollTo({ left: target, behavior: "smooth" });
            window.setTimeout(() => slider.classList.remove("is-settling"), 520);
        };

        const finishDrag = () => {
            if (!isDragging) {
                return;
            }

            isDragging = false;
            activePointerId = null;
            slider.classList.remove("is-dragging");
            viewport.style.scrollSnapType = "";

            const maxScrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
            const step = getCardStep();
            const projectedScrollLeft = viewport.scrollLeft - dragVelocity * 180;
            const targetIndex = Math.max(0, Math.min(Math.round(projectedScrollLeft / step), cards.length - 1));
            const target = Math.max(0, Math.min(cards[targetIndex].offsetLeft, maxScrollLeft));
            viewport.scrollTo({ left: target, behavior: "smooth" });
            window.setTimeout(() => {
                hasDragged = false;
                dragVelocity = 0;
            }, 0);
        };

        prevButton.addEventListener("click", () => scrollByCard(-1));
        nextButton.addEventListener("click", () => scrollByCard(1));

        viewport.addEventListener("pointerdown", (event) => {
            if (event.button !== undefined && event.button !== 0) {
                return;
            }

            isDragging = true;
            hasDragged = false;
            activePointerId = event.pointerId;
            dragStartX = event.clientX;
            dragStartScrollLeft = viewport.scrollLeft;
            lastPointerX = event.clientX;
            lastPointerTime = performance.now();
            dragVelocity = 0;
            viewport.style.scrollSnapType = "none";
            slider.classList.add("is-dragging");
            viewport.setPointerCapture(event.pointerId);
        });

        viewport.addEventListener("pointermove", (event) => {
            if (!isDragging || event.pointerId !== activePointerId) {
                return;
            }

            const delta = event.clientX - dragStartX;
            const now = performance.now();
            const elapsed = Math.max(now - lastPointerTime, 1);
            const pointerDelta = event.clientX - lastPointerX;
            if (Math.abs(delta) > 3) {
                hasDragged = true;
            }
            dragVelocity = pointerDelta / elapsed;
            lastPointerX = event.clientX;
            lastPointerTime = now;
            viewport.scrollLeft = dragStartScrollLeft - delta * 1.05;
        });

        viewport.addEventListener("pointerup", finishDrag);
        viewport.addEventListener("pointercancel", finishDrag);
        viewport.addEventListener("lostpointercapture", finishDrag);

        viewport.addEventListener("click", (event) => {
            if (hasDragged) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        viewport.addEventListener("scroll", () => window.requestAnimationFrame(updateSliderState));
        window.addEventListener("resize", updateSliderState);

        updateSliderState();
    });

    const findFirstMatchingElement = (selectors) => {
        for (const selector of selectors) {
            if (!selector) {
                continue;
            }
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        return null;
    };

    const scrollButtons = document.querySelectorAll("[data-scroll-target]");
    scrollButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            const fallbackList = button.dataset.scrollFallback
                ? button.dataset.scrollFallback.split(",").map((item) => item.trim()).filter(Boolean)
                : [];
            const selectorPreference = [
                button.dataset.scrollTarget,
                ...fallbackList,
                ".container-tag-list",
                ".card-container",
                ".cta-section",
            ];
            const targetElement = findFirstMatchingElement(selectorPreference);
            if (!targetElement) {
                return;
            }
            event.preventDefault();
            const block = button.dataset.scrollBlock || "start";
            targetElement.scrollIntoView({ behavior: "smooth", block });
        });
    });

    const navSearchInput = document.getElementById("navbar-search-input");
    if (navSearchInput) {
        const mergeTags = (primary, secondary) => {
            const merged = Array.isArray(primary) ? [...primary] : [];
            if (Array.isArray(secondary)) {
                secondary.forEach((tag) => {
                    if (typeof tag === "string" && !merged.includes(tag)) {
                        merged.push(tag);
                    }
                });
            }
            return merged;
        };

        const searchForm = navSearchInput.closest(".rausr-menu__search-form");
        const searchPlaceholder = document.getElementById("navbar-search-placeholder");
        const strokePalettes = [
            ["#5DFFF1", "#E1FFD8", "#FFE57A", "#FF9CE8", "#886BFF", "#8EEFFF"],
            ["#D4FFCE", "#70EBDD", "#A8A9D5", "#7355FF", "#FFD091", "#F8F8F8"],
            ["#8EEFFF", "#C8FFF4", "#D4FFCE", "#FFF29C", "#B5A4FF", "#7355FF"],
            ["#FFE57A", "#FFD091", "#FF9CE8", "#A8A9D5", "#70EBDD", "#E1FFD8"],
        ];
        const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        let strokePaletteIndex = 0;
        let strokePaletteInterval = null;

        const applySearchStrokePalette = (palette) => {
            if (!searchForm || !Array.isArray(palette)) {
                return;
            }
            palette.forEach((color, index) => {
                searchForm.style.setProperty(`--rausr-search-color-${String.fromCharCode(97 + index)}`, color);
            });
            searchForm.style.backgroundColor = palette[0];
        };

        const startSearchStrokeAnimation = () => {
            if (!searchForm) {
                return;
            }

            applySearchStrokePalette(strokePalettes[strokePaletteIndex]);

            if (reduceMotionQuery.matches || strokePaletteInterval) {
                return;
            }

            strokePaletteInterval = window.setInterval(() => {
                strokePaletteIndex = (strokePaletteIndex + 1) % strokePalettes.length;
                applySearchStrokePalette(strokePalettes[strokePaletteIndex]);
            }, 1800);
        };

        const syncSearchStrokeMotion = () => {
            if (reduceMotionQuery.matches && strokePaletteInterval) {
                window.clearInterval(strokePaletteInterval);
                strokePaletteInterval = null;
            } else {
                startSearchStrokeAnimation();
            }
        };

        startSearchStrokeAnimation();
        if (typeof reduceMotionQuery.addEventListener === "function") {
            reduceMotionQuery.addEventListener("change", syncSearchStrokeMotion);
        } else if (typeof reduceMotionQuery.addListener === "function") {
            reduceMotionQuery.addListener(syncSearchStrokeMotion);
        }

        const shortenPlaceholderPhrase = (phrase) => {
            const cleanPhrase = String(phrase || "").replace(/\s+/g, " ").trim();
            if (cleanPhrase.length <= 38) {
                return cleanPhrase;
            }
            return `${cleanPhrase.slice(0, 35).trimEnd()}...`;
        };

        let placeholderPhrases = [];
        try {
            const encodedPhrases = navSearchInput.dataset.placeholderPhrasesBase64 || "";
            const phraseJson = encodedPhrases
                ? new TextDecoder("utf-8").decode(Uint8Array.from(window.atob(encodedPhrases), (char) => char.charCodeAt(0)))
                : "[]";
            const parsedPhrases = JSON.parse(phraseJson);
            placeholderPhrases = Array.isArray(parsedPhrases)
                ? parsedPhrases.map(shortenPlaceholderPhrase).filter(Boolean)
                : [];
        } catch (error) {
            placeholderPhrases = [];
        }

        if (!placeholderPhrases.length) {
            placeholderPhrases = ["Event Design", "Product Design", "Digital Graphic Design"];
        }

        const placeholderTypeSpeed = 40;
        const placeholderHoldDuration = 5000;
        let placeholderPhraseIndex = 0;
        let placeholderCharIndex = 0;
        let placeholderTypingTimeout = null;
        let placeholderHoldTimeout = null;
        let placeholderAnimating = false;

        const getRandomPlaceholderIndex = () => {
            if (placeholderPhrases.length <= 1) {
                return 0;
            }

            let nextIndex = placeholderPhraseIndex;
            while (nextIndex === placeholderPhraseIndex) {
                nextIndex = Math.floor(Math.random() * placeholderPhrases.length);
            }
            return nextIndex;
        };

        const setSearchPlaceholder = (value) => {
            if (!searchPlaceholder) {
                navSearchInput.setAttribute("placeholder", value);
                return;
            }

            navSearchInput.setAttribute("placeholder", "");
            searchPlaceholder.textContent = value;
            searchPlaceholder.classList.toggle("is-visible", Boolean(value));
        };

        const stopPlaceholderAnimation = () => {
            placeholderAnimating = false;
            if (placeholderTypingTimeout) {
                window.clearTimeout(placeholderTypingTimeout);
                placeholderTypingTimeout = null;
            }
            if (placeholderHoldTimeout) {
                window.clearTimeout(placeholderHoldTimeout);
                placeholderHoldTimeout = null;
            }
        };

        const typePlaceholderChar = () => {
            if (!placeholderAnimating) {
                return;
            }

            const phrase = placeholderPhrases[placeholderPhraseIndex];
            placeholderCharIndex += 1;
            setSearchPlaceholder(phrase.slice(0, placeholderCharIndex));

            if (placeholderCharIndex < phrase.length) {
                placeholderTypingTimeout = window.setTimeout(typePlaceholderChar, placeholderTypeSpeed);
                return;
            }

            placeholderHoldTimeout = window.setTimeout(() => {
                placeholderPhraseIndex = getRandomPlaceholderIndex();
                placeholderCharIndex = 0;
                setSearchPlaceholder("");
                placeholderTypingTimeout = window.setTimeout(typePlaceholderChar, placeholderTypeSpeed);
            }, placeholderHoldDuration);
        };

        const startPlaceholderAnimation = () => {
            if (placeholderAnimating) {
                return;
            }
            if (document.activeElement === navSearchInput || navSearchInput.value.trim()) {
                setSearchPlaceholder("");
                return;
            }
            placeholderAnimating = true;
            placeholderPhraseIndex = getRandomPlaceholderIndex();
            placeholderCharIndex = 0;
            setSearchPlaceholder("");
            placeholderTypingTimeout = window.setTimeout(typePlaceholderChar, placeholderTypeSpeed);
        };

        navSearchInput.addEventListener("focus", () => {
            stopPlaceholderAnimation();
            setSearchPlaceholder("");
        });

        navSearchInput.addEventListener("blur", () => {
            if (navSearchInput.value.trim()) {
                setSearchPlaceholder("");
                return;
            }
            startPlaceholderAnimation();
        });

        startPlaceholderAnimation();

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
                    searchData = Array.isArray(json)
                        ? json.map((item) => {
                            const mergedTags = mergeTags(item.tags, item.seotags);
                            return Object.assign({}, item, { tags: mergedTags });
                        })
                        : [];
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

                    const sectionClass = item.section === "works" ? "works" : "blog";
                    const thumb = document.createElement("span");
                    thumb.className = "navbar-search__thumb";

                    const thumbFallbackRaw = item.image_thumb || item.image || item.preview_image || "";
                    const thumbFallback2xRaw = item.image_thumb_2x || "";
                    const thumbWebpRaw = item.image_thumb_webp || "";
                    const thumbWebp2xRaw = item.image_thumb_webp_2x || "";
                    const thumbSizes = "36px";

                    if (thumbFallbackRaw || thumbWebpRaw) {
                        const picture = document.createElement("picture");
                        if (thumbWebpRaw) {
                            const sourceWebp = document.createElement("source");
                            const webpSet = thumbWebp2xRaw
                                ? `${thumbWebpRaw} 1x, ${thumbWebp2xRaw} 2x`
                                : `${thumbWebpRaw} 1x`;
                            sourceWebp.type = "image/webp";
                            sourceWebp.srcset = webpSet;
                            sourceWebp.sizes = thumbSizes;
                            picture.appendChild(sourceWebp);
                        }

                        const img = document.createElement("img");
                        img.className = "navbar-search__thumb-img";
                        img.src = thumbFallbackRaw;
                        img.alt = item.title || "";
                        img.loading = "lazy";
                        img.decoding = "async";
                        img.sizes = thumbSizes;
                        img.width = 36;
                        img.height = 36;
                        if (thumbFallback2xRaw) {
                            img.srcset = `${thumbFallbackRaw} 1x, ${thumbFallback2xRaw} 2x`;
                        }
                        picture.appendChild(img);
                        thumb.appendChild(picture);
                    } else {
                        thumb.classList.add("navbar-search__thumb--placeholder", "navbar-search__thumb--" + sectionClass);
                        thumb.textContent = sectionClass === "works" ? "W" : "A";
                    }

                    const meta = document.createElement("span");
                    meta.className = "navbar-search__meta";

                    const title = document.createElement("span");
                    title.className = "navbar-search__title";
                    title.textContent = item.title;

                    const category = document.createElement("span");
                    category.className = "navbar-search__category navbar-search__category--" + sectionClass;
                    category.textContent = "in " + (item.section === "blog" ? "Articles" : "Works");
                    const categoryHref = item.section === "blog" ? "/blog/" : "/works/";
                    category.tabIndex = 0;
                    category.setAttribute("role", "link");
                    const navigateToCategory = (event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        window.location.href = categoryHref;
                    };
                    category.addEventListener("click", navigateToCategory);
                    category.addEventListener("keydown", (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            navigateToCategory(event);
                        }
                    });

                    const arrow = document.createElement("span");
                    arrow.className = "navbar-search__arrow";
                    arrow.textContent = "\u2192";

                    meta.appendChild(title);
                    meta.appendChild(category);

                    link.appendChild(thumb);
                    link.appendChild(meta);
                    link.appendChild(arrow);

                    li.appendChild(link);
                    resultsList.appendChild(li);
                });
            }

            if (seeAllLink) {
                const hasQuery = Boolean(query);
                if (hasQuery) {
                    const suffix = (baseHasQuery ? "&q=" : "?q=") + encodeURIComponent(query);
                    seeAllLink.href = searchBase + suffix;
                    seeAllLink.classList.remove("is-disabled");
                    seeAllLink.removeAttribute("aria-disabled");
                    seeAllLink.removeAttribute("tabindex");
                } else {
                    seeAllLink.href = searchBase;
                    seeAllLink.classList.add("is-disabled");
                    seeAllLink.setAttribute("aria-disabled", "true");
                    seeAllLink.setAttribute("tabindex", "-1");
                }
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

            const articleNumberMatch = trimmed.match(/^(?:article\s*#?\s*|#)?(\d+)$/i);
            const exactArticleNumber = articleNumberMatch ? Number(articleNumberMatch[1]) : null;
            const needle = trimmed.toLowerCase();
            const matches = exactArticleNumber !== null
                ? searchData
                    .filter((item) => item.section === "blog" && Number(item.article_number) === exactArticleNumber)
                    .slice(0, 4)
                : searchData
                    .filter((item) => {
                        const haystack = [
                            item.title || "",
                            item.description || "",
                            Array.isArray(item.tags) ? item.tags.join(" ") : "",
                            Array.isArray(item.seotags) ? item.seotags.join(" ") : "",
                            item.article_number || ""
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

    const rausrMenu = document.querySelector("[data-rausr-menu]");
    const rausrMenuPanel = document.getElementById("rausrMenuPanel");
    const rausrMenuToggle = document.getElementById("rausrMenuToggle");
    const rausrMenuIcon = document.getElementById("rausrMenuIcon");
    const pageBlur = document.getElementById("page-blur");
    const rausrMenuWrap = rausrMenu ? rausrMenu.closest(".rausr-menu-wrap") : null;

    if (rausrMenu && rausrMenuPanel && rausrMenuToggle && rausrMenuIcon && pageBlur && rausrMenuWrap) {
        const closedIcon = "/svg/hamb.svg";
        const openIcon = "/svg/hamb-open.svg";
        const mobileQuery = window.matchMedia("(max-width: 991px)");
        const dropdownItems = Array.from(rausrMenu.querySelectorAll("[data-rausr-dropdown]"));

        [closedIcon, openIcon].forEach((src) => {
            const preload = new Image();
            preload.src = src;
        });

        const hasActiveDesktopDropdown = () => dropdownItems.some((item) => (
            item.classList.contains("is-open")
            || item.matches(":hover")
            || item.contains(document.activeElement)
        ));

        const syncDropdownDimState = () => {
            rausrMenuWrap.classList.toggle("is-dimmed", !mobileQuery.matches && hasActiveDesktopDropdown());
        };

        const setPanelState = (isOpen) => {
            rausrMenuPanel.classList.toggle("is-open", isOpen);
            rausrMenuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            rausrMenuIcon.src = isOpen ? openIcon : closedIcon;
            pageBlur.classList.toggle("blur-active", isOpen && mobileQuery.matches);
            if (mobileQuery.matches) {
                rausrMenuWrap.classList.remove("is-dimmed");
            }
        };

        const closeDropdowns = (exceptItem = null) => {
            dropdownItems.forEach((item) => {
                const trigger = item.querySelector("[data-rausr-trigger]");
                if (exceptItem && item === exceptItem) {
                    return;
                }
                item.classList.remove("is-open");
                if (trigger) {
                    trigger.setAttribute("aria-expanded", "false");
                }
            });
            window.requestAnimationFrame(syncDropdownDimState);
        };

        const closePanel = () => {
            setPanelState(false);
            closeDropdowns();
        };

        rausrMenuToggle.addEventListener("click", (event) => {
            event.preventDefault();
            setPanelState(!rausrMenuPanel.classList.contains("is-open"));
        });

        dropdownItems.forEach((item) => {
            const trigger = item.querySelector("[data-rausr-trigger]");
            if (!trigger) {
                return;
            }
            if (trigger.tagName.toLowerCase() === "button") {
                trigger.addEventListener("click", (event) => {
                    event.preventDefault();
                    const shouldOpen = !item.classList.contains("is-open");
                    closeDropdowns(shouldOpen ? item : null);
                    item.classList.toggle("is-open", shouldOpen);
                    trigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
                    syncDropdownDimState();
                });
            }

            item.addEventListener("mouseenter", syncDropdownDimState);
            item.addEventListener("mouseleave", () => window.requestAnimationFrame(syncDropdownDimState));
            item.addEventListener("focusin", syncDropdownDimState);
            item.addEventListener("focusout", () => window.requestAnimationFrame(syncDropdownDimState));
        });

        document.addEventListener("click", (event) => {
            if (rausrMenu.contains(event.target)) {
                return;
            }
            closeDropdowns();
            if (mobileQuery.matches) {
                closePanel();
            }
        });

        document.addEventListener("keyup", (event) => {
            if (event.key === "Escape") {
                closePanel();
            }
        });

        rausrMenuPanel.addEventListener("click", (event) => {
            const link = event.target.closest("a");
            if (link && mobileQuery.matches) {
                closePanel();
            }
        });

        const resetForViewport = () => {
            if (!mobileQuery.matches) {
                setPanelState(false);
            }
            syncDropdownDimState();
        };

        window.addEventListener("resize", resetForViewport);
        if (typeof mobileQuery.addEventListener === "function") {
            mobileQuery.addEventListener("change", resetForViewport);
        } else if (typeof mobileQuery.addListener === "function") {
            mobileQuery.addListener(resetForViewport);
        }

        setPanelState(false);
    }

    const navbarCollapse = document.getElementById("navbarSupportedContent");
    const navbarToggle = document.getElementById("menuToggle");
    const navbarIcon = document.getElementById("menuIcon");
    const legacyPageBlur = document.getElementById("page-blur");

    if (navbarCollapse && navbarToggle && navbarIcon && legacyPageBlur) {
        const closedIcon = "/svg/hamb.svg";
        const openIcon = "/svg/hamb-open.svg";

        [closedIcon, openIcon].forEach((src) => {
            const preload = new Image();
            preload.src = src;
        });

        const setUiState = (isOpen) => {
            navbarIcon.src = isOpen ? openIcon : closedIcon;
            legacyPageBlur.classList.toggle("blur-active", isOpen);
            navbarToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        };

        const syncState = () => setUiState(navbarCollapse.classList.contains("show"));

        const observer = new MutationObserver(syncState);
        observer.observe(navbarCollapse, { attributes: true, attributeFilter: ["class"] });

        const openMenu = () => {
            if (navbarCollapse.classList.contains("show")) {
                syncState();
                return;
            }
            navbarCollapse.classList.add("show");
            navbarCollapse.classList.remove("collapsing");
            navbarCollapse.style.height = "";
            syncState();
        };

        const closeMenu = () => {
            if (!navbarCollapse.classList.contains("show")) {
                syncState();
                return;
            }
            navbarCollapse.classList.remove("show");
            navbarCollapse.classList.remove("collapsing");
            navbarCollapse.style.height = "";
            syncState();
        };

        const toggleMenu = () => {
            if (navbarCollapse.classList.contains("show")) {
                closeMenu();
            } else {
                openMenu();
            }
        };

        navbarToggle.addEventListener("click", (event) => {
            event.preventDefault();
            window.requestAnimationFrame(toggleMenu);
        });

        document.addEventListener("click", (event) => {
            if (!navbarCollapse.classList.contains("show")) {
                return;
            }
            if (navbarCollapse.contains(event.target) || navbarToggle.contains(event.target)) {
                return;
            }
            closeMenu();
        });

        document.addEventListener("keyup", (event) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        });

        navbarCollapse.addEventListener("click", (event) => {
            const link = event.target.closest("a");
            if (!link) {
                return;
            }
            if (link.getAttribute("href")) {
                closeMenu();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth >= 992) {
                closeMenu();
            }
        });

        syncState();
    }

    let lightboxInstance = null;

    const initLightbox = () => {
        if (typeof window.GLightbox !== "function") {
            return;
        }
        if (lightboxInstance) {
            return;
        }
        lightboxInstance = window.GLightbox({
            selector: ".glightbox"
        });
    };

    initLightbox();
    window.addEventListener("load", initLightbox);

    const navbar = document.querySelector(".navbar");
    const navbarContainer = navbar ? navbar.closest(".container-fluid") : null;
    const navbarSearchDropdown = document.getElementById("navbar-search-dropdown");

    if (navbar && navbarContainer && navbarCollapse && navbarToggle) {
        const mobileQuery = window.matchMedia("(max-width: 991px)");
        const DOWN_SCROLL_HIDE_DISTANCE = 120; // require more downward travel before hiding
        const UP_SCROLL_REVEAL_DISTANCE = 180; // and a longer upward travel before restoring the navbar
        const ACTIVATE_OFFSET = 72;
        let lastScrollY = window.scrollY;
        let directionAnchorY = window.scrollY;
        let lastDirection = 0;
        let rafId = null;
        let compactActive = false;
        let layoutSyncPending = false;
        let searchLockActive = false;

        const syncAnchorsNow = (value) => {
            lastScrollY = value;
            directionAnchorY = value;
            lastDirection = 0;
        };

        const isSearchEngaged = () => {
            if (!navSearchInput) {
                return false;
            }
            if (document.activeElement === navSearchInput) {
                return true;
            }
            if (navbarSearchDropdown && !navbarSearchDropdown.hasAttribute("hidden")) {
                return true;
            }
            return false;
        };

        const applyCompactState = (shouldActivate) => {
            if (compactActive === shouldActivate) {
                return;
            }
            compactActive = shouldActivate;
            navbar.classList.toggle("navbar--search-only", shouldActivate);
            navbarContainer.classList.toggle("container-fluid--search-only", shouldActivate);
            layoutSyncPending = true;
            window.requestAnimationFrame(() => {
                layoutSyncPending = false;
            });
        };

        const resetState = (currentY) => {
            syncAnchorsNow(currentY);
            if (compactActive) {
                applyCompactState(false);
            }
        };

        const evaluateNavbarState = (forceDefault = false) => {
            const currentY = window.scrollY;

            if (layoutSyncPending) {
                lastScrollY = currentY;
                return;
            }

            if (forceDefault || !mobileQuery.matches) {
                resetState(currentY);
                return;
            }

            if (navbarCollapse.classList.contains("show")) {
                resetState(currentY);
                return;
            }

            if (searchLockActive || isSearchEngaged()) {
                syncAnchorsNow(currentY);
                return;
            }

            if (currentY <= ACTIVATE_OFFSET) {
                resetState(currentY);
                return;
            }

            const delta = currentY - lastScrollY;
            const direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;

            if (direction === 0) {
                lastScrollY = currentY;
                return;
            }

            if (direction !== lastDirection) {
                directionAnchorY = lastScrollY;
                lastDirection = direction;
            }

            if (direction > 0 && !compactActive && currentY - directionAnchorY > DOWN_SCROLL_HIDE_DISTANCE) {
                syncAnchorsNow(currentY);
                applyCompactState(true);
                return;
            }

            if (direction < 0 && compactActive && directionAnchorY - currentY > UP_SCROLL_REVEAL_DISTANCE) {
                syncAnchorsNow(currentY);
                applyCompactState(false);
                return;
            }

            lastScrollY = currentY;
        };

        const requestEvaluation = (forceDefault = false) => {
            if (forceDefault) {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                evaluateNavbarState(true);
                return;
            }

            if (rafId) {
                return;
            }

            rafId = window.requestAnimationFrame(() => {
                evaluateNavbarState(false);
                rafId = null;
            });
        };

        window.addEventListener("scroll", () => requestEvaluation(false), { passive: true });
        window.addEventListener("resize", () => requestEvaluation(false));

        if (typeof mobileQuery.addEventListener === "function") {
            mobileQuery.addEventListener("change", () => requestEvaluation(false));
        } else if (typeof mobileQuery.addListener === "function") {
            mobileQuery.addListener(() => requestEvaluation(false));
        }

        const collapseObserver = new MutationObserver(() => requestEvaluation(true));
        collapseObserver.observe(navbarCollapse, { attributes: true, attributeFilter: ["class"] });

        if (navSearchInput) {
            navSearchInput.addEventListener("focus", () => {
                searchLockActive = true;
                const currentScroll = window.scrollY;
                syncAnchorsNow(currentScroll);
                applyCompactState(false);
            });
            navSearchInput.addEventListener("blur", () => {
                searchLockActive = false;
                requestEvaluation(true);
            });
        }

        navbarToggle.addEventListener("click", () => window.requestAnimationFrame(() => evaluateNavbarState(true)));

        evaluateNavbarState(true);
    }

    const kitchenCards = document.querySelectorAll("[data-kitchen-card]");
    if (kitchenCards.length) {
        const collapseOtherKitchenCards = (activeCard, animate = true) => {
            kitchenCards.forEach((candidate) => {
                if (candidate === activeCard) {
                    return;
                }
                if (candidate.classList.contains("is-open")) {
                    setKitchenCardState(candidate, false, animate);
                }
            });
        };

        const setKitchenCardState = (card, expanded, animate = true) => {
            const roller = card.querySelector("[data-kitchen-roller]");
            const toggle = card.querySelector("[data-kitchen-toggle]");
            const title = (card.querySelector(".about-kitchen-card__head h3")?.textContent || "section").trim();
            if (!roller) {
                return;
            }

            const targetHeight = expanded ? roller.scrollHeight : 0;
            const applyExpandedState = () => {
                card.classList.toggle("is-open", expanded);
                card.classList.toggle("is-collapsed", !expanded);
                if (toggle) {
                    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
                    toggle.setAttribute("aria-label", (expanded ? "Collapse " : "Expand ") + title);
                }
            };

            if (!animate) {
                const prevTransition = roller.style.transition;
                roller.style.transition = "none";
                applyExpandedState();
                roller.style.maxHeight = targetHeight + "px";
                roller.getBoundingClientRect();
                roller.style.transition = prevTransition;
                return;
            }

            roller.style.maxHeight = roller.getBoundingClientRect().height + "px";
            applyExpandedState();
            window.requestAnimationFrame(() => {
                roller.style.maxHeight = targetHeight + "px";
            });
        };

        kitchenCards.forEach((card) => {
            const toggle = card.querySelector("[data-kitchen-toggle]");

            const startsExpanded = card.classList.contains("is-open");
            setKitchenCardState(card, startsExpanded, false);

            if (toggle) {
                toggle.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const expanded = card.classList.contains("is-open");
                    const shouldExpand = !expanded;
                    if (shouldExpand) {
                        collapseOtherKitchenCards(card, true);
                    }
                    setKitchenCardState(card, shouldExpand, true);
                });
            }

            card.addEventListener("click", () => {
                if (!card.classList.contains("is-collapsed")) {
                    return;
                }
                collapseOtherKitchenCards(card, true);
                setKitchenCardState(card, true, true);
            });
        });

        const initiallyOpenCards = Array.from(kitchenCards).filter((card) => card.classList.contains("is-open"));
        if (initiallyOpenCards.length > 1) {
            initiallyOpenCards.slice(1).forEach((card) => setKitchenCardState(card, false, false));
        }

        window.addEventListener("resize", () => {
            kitchenCards.forEach((card) => {
                const expanded = card.classList.contains("is-open");
                setKitchenCardState(card, expanded, false);
            });
        });
    }

    const copyButtons = document.querySelectorAll("[data-copy-target]");
    if (copyButtons.length) {
        copyButtons.forEach((button) => {
            const text = button.dataset.copyTarget || "";
            if (!text) {
                return;
            }

            const wrapper = button.closest("[data-copy-wrapper]") || button.closest(".contact-copy-group");
            const feedback = wrapper ? wrapper.querySelector(".contact-copy-feedback") : null;
            const valueElement = button.closest(".contact-email-row, .contact-company-row")
                ? button.closest(".contact-email-row, .contact-company-row").querySelector(".contact-email, .contact-company-value")
                : null;
            let resetTimeout = null;

            const setState = (copied) => {
                button.classList.toggle("is-copied", copied);
                button.setAttribute("aria-pressed", copied ? "true" : "false");
                if (feedback) {
                    feedback.hidden = true;
                }
                if (valueElement) {
                    if (copied) {
                        if (!valueElement.dataset.copyOriginal) {
                            valueElement.dataset.copyOriginal = valueElement.textContent;
                        }
                        valueElement.textContent = "Copied";
                        valueElement.classList.add("contact-copy-flash");
                    } else if (valueElement.dataset.copyOriginal) {
                        valueElement.textContent = valueElement.dataset.copyOriginal;
                        delete valueElement.dataset.copyOriginal;
                        valueElement.classList.remove("contact-copy-flash");
                    }
                }
                if (copied) {
                    window.clearTimeout(resetTimeout);
                    resetTimeout = window.setTimeout(() => setState(false), 1800);
                }
            };

            const copyText = async () => {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                        setState(true);
                        return;
                    }
                } catch (err) {
                    // fall through to legacy path
                }

                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "absolute";
                textarea.style.left = "-9999px";
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand("copy");
                    setState(true);
                } catch (err) {
                    console.error("Copy failed", err);
                } finally {
                    document.body.removeChild(textarea);
                }
            };

            setState(false);

            button.addEventListener("click", (event) => {
                event.preventDefault();
                copyText();
            });
        });
    }
});

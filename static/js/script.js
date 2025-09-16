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
});

document.addEventListener("DOMContentLoaded", function () {
    const tagListWrapper = document.querySelector(".tag-list-wrapper");
    const tagList = document.querySelector(".tag-list");
    const leftButton = document.querySelector(".tag-scroll.left");
    const rightButton = document.querySelector(".tag-scroll.right");

    const tagItems = tagList.children; // Get all tag buttons
    const visibleCount = 4; // Number of visible tags
    let currentIndex = 0; // Track first visible tag

    function updateButtons() {
        leftButton.style.visibility = currentIndex > 0 ? "visible" : "hidden";
        rightButton.style.visibility = (currentIndex + visibleCount >= tagItems.length) ? "hidden" : "visible";
    }

    function scrollTags(direction) {
        if (direction === "right" && currentIndex + visibleCount < tagItems.length) {
            currentIndex += visibleCount;
        } else if (direction === "left" && currentIndex > 0) {
            currentIndex -= visibleCount;
        }
        
        if (currentIndex >= tagItems.length - visibleCount) {
            currentIndex = tagItems.length - visibleCount;
        }
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        
        const scrollToElement = tagItems[currentIndex];
        tagListWrapper.scrollTo({ left: scrollToElement.offsetLeft - tagListWrapper.offsetLeft, behavior: "smooth" });

        updateButtons();
    }

    leftButton.addEventListener("click", () => scrollTags("left"));
    rightButton.addEventListener("click", () => scrollTags("right"));

    updateButtons(); // Initial button state
});

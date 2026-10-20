const openButton = document.querySelector("#openPublisher");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");

openButton.addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "open-publisher" });
  window.close();
});

(async () => {
  const result = await RausrNative.request("status");
  const connected = Boolean(result?.ok && result?.companionAvailable);
  statusDot.classList.toggle("is-online", connected);
  statusText.textContent = connected ? "Companion connected" : "Setup available in publisher";
})();

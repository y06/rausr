browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;
  const { onboardingComplete } = await browser.storage.local.get("onboardingComplete");
  if (!onboardingComplete) {
    await browser.tabs.create({ url: browser.runtime.getURL("publisher.html#welcome") });
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "open-publisher") {
    return browser.tabs.create({ url: browser.runtime.getURL("publisher.html") });
  }
  return undefined;
});

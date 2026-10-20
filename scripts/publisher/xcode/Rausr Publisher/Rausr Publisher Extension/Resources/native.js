const RausrNative = (() => {
  const applicationId = "com.rausr.publisher";

  async function request(action, payload = {}) {
    try {
      const response = await browser.runtime.sendNativeMessage(applicationId, { action, ...payload });
      return response || { ok: false, error: "Empty response from companion." };
    } catch (error) {
      return { ok: false, companionAvailable: false, error: String(error) };
    }
  }

  return { request };
})();

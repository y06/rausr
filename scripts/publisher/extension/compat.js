if (typeof browser === "undefined") {
  const previewStore = {};
  window.browser = {
    storage: {
      local: {
        async get(keys) {
          const names = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(names.filter(name => name in previewStore).map(name => [name, previewStore[name]]));
        },
        async set(values) { Object.assign(previewStore, values); }
      }
    },
    runtime: {
      async sendNativeMessage() { throw new Error("Native messaging is available inside Safari."); },
      async sendMessage() { return {}; },
      getURL(path) { return path; }
    },
    tabs: { async create() { return {}; } }
  };
}

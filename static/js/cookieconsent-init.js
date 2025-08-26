<script>
document.addEventListener("DOMContentLoaded", function () {
  CookieConsent.run({
    guiOptions: {
      consentModal: {
        layout: "bar",          // box/cloud/bar
        position: "bottom center",
        flipButtons: false
      }
    },
    categories: {
      necessary: {
        enabled: true,          // always enabled
        readOnly: true
      },
      analytics: {},
      marketing: {}
    },
    language: {
      default: "en",
      translations: {
        en: {
          consentModal: {
            title: "We use cookies 🍪",
            description: "We use necessary cookies to make our site work. Analytics and marketing cookies help us improve your experience.",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Only necessary",
            showPreferencesBtn: "Manage preferences"
          },
          preferencesModal: {
            title: "Cookie preferences",
            savePreferencesBtn: "Save preferences",
            sections: [
              {
                title: "Necessary cookies",
                description: "Always enabled for the site to function."
              },
              {
                title: "Analytics cookies",
                description: "Help us understand how you use our site."
              },
              {
                title: "Marketing cookies",
                description: "Used for personalized advertising."
              }
            ]
          }
        }
      }
    }
  });
});
</script>
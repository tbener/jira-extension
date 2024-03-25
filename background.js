DEFAULT_CUSTOM_DOMAIN = 'mdclone'
DEFAULT_PROJECT_KEY = 'adams'

chrome.runtime.onInstalled.addListener(function (details) {
    // Check if the extension is newly installed
    if (details.reason === "install") {
        // Save default settings or perform any necessary setup
        saveDefaultSettings();
    }
});

function saveDefaultSettings() {
    const customDomain = DEFAULT_CUSTOM_DOMAIN;
    const defaultProjectKey = DEFAULT_PROJECT_KEY;

    chrome.storage.sync.set(
        { customDomain, defaultProjectKey },
        () => {
            console.log(`Default settings saved: ${DEFAULT_CUSTOM_DOMAIN}, ${DEFAULT_PROJECT_KEY}`);
        }
    );
}


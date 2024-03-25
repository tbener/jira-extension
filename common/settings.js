const SettingsHandler = (() => {
    let settings = {
        customDomain: 'www',
        defaultProjectKey: 'jira',
        versionDisplay: `v${chrome.runtime.getManifest().version}`
    };

    // Function to update settings
    const updateSettings = (customDomain, defaultProjectKey) => {
        settings.customDomain = customDomain;
        settings.defaultProjectKey = defaultProjectKey;
    };

    // Function to retrieve settings asynchronously
    const getSettings = () => {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(
                { customDomain: 'www', defaultProjectKey: 'jira' },
                (items) => {
                    updateSettings(items.customDomain, items.defaultProjectKey);
                    resolve(settings);
                }
            );
        });
    };

    return {
        getSettings
    };

})();

window.SettingsHandler = SettingsHandler;

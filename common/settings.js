const SettingsHandler = (() => {
    // Define default settings
    const defaultSettings = {
        customDomain: 'www',
        defaultProjectKey: 'jira',
        boardUrl: '',
    };

    const additionalSettings = {
        versionDisplay: `v${chrome.runtime.getManifest().version}`
    }

    // Initialize settings with default values
    let settings = { ...defaultSettings };

    // Function to update settings
    const updateSettings = (newSettings) => {
        Object.assign(settings, newSettings);
    };

    // Function to retrieve settings asynchronously
    const getSettings = () => {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(defaultSettings, (items) => {
                updateSettings(items);
                resolve({ ...settings, ...additionalSettings });
            });
        });
    };

    // Function to save settings
    const saveSettings = (newSettings) => {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(newSettings, () => {
                updateSettings(newSettings);
                console.log(`Settings saved: ${JSON.stringify(newSettings)}`);
                resolve(settings);
            });
        });
    };

    return {
        getSettings,
        saveSettings
    };
})();

window.SettingsHandler = SettingsHandler;

export class SettingsService {
    defaultSettings = {
        customDomain: 'www',
        defaultProjectKey: 'jira',
        boardUrl: '',
        useSmartNavigation: true
    };

    additionalSettings = {
        versionDisplay: `v${chrome.runtime.getManifest().version}`
    };

    settings = {}

    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings, this.additionalSettings);
        console.log("Settings: ", this.settings);
    }


    async readSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(this.defaultSettings, (items) => {
                this.updateSettings(items);
                resolve(this.settings);
            });
        });
    }

    saveSettings(newSettings) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set(newSettings, () => {
                this.updateSettings(newSettings);
                console.log(`Settings saved: ${JSON.stringify(newSettings)}`);
                resolve(this.settings);
            });
        });
    }
}


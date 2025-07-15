export class SettingsService {
    defaultSettings = {
        customDomain: 'www',
        defaultProjectKey: 'jira',
        boardUrl: '',
        useSmartNavigation: true,
        showDueDateAlert: true,
        dueDateOptions: {
            messageTemplate: {
                with: '{status} due date: {date}',
                without: '(Missing {status} due date)',
            }
        }
    };

    additionalSettings = {
        versionDisplay: `v${chrome.runtime.getManifest().version}`
    };

    settings = {}

    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings, this.additionalSettings);
    }
    
    
    async readSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(this.defaultSettings, (items) => {
                console.log("Settings read: ", this.settings);
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


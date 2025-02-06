import {injectable, singleton} from 'tsyringe';

interface MutableSettings {
    customDomain: string;
    defaultProjectKey: string;
}

interface ReadonlySettings {
    versionDisplay: string;
}

interface CompleteSettings extends MutableSettings, ReadonlySettings {
}

@singleton()
@injectable()
export default class SettingsHandler {
    private _settings: CompleteSettings | null = null;

    private static defaultSettings: MutableSettings = {
        customDomain: 'www',
        defaultProjectKey: 'jira'
    };

    constructor() {
        this.loadSettings();
    }

    private async loadSettings(): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.sync.get(SettingsHandler.defaultSettings, (items) => {
                this._settings = {
                    ...SettingsHandler.defaultSettings,
                    ...items,
                    versionDisplay: `v${chrome.runtime.getManifest().version}`
                };
                resolve();
            });
        });
    }

    get settings(): CompleteSettings {
        if (!this._settings) {
            throw new Error('Settings not loaded. Ensure initialization is complete.');
        }
        return this._settings;
    }

    async saveSettings(newSettings: Partial<MutableSettings>): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.sync.set(newSettings, () => {
                this._settings = {
                    ...this._settings!,
                    ...newSettings
                };
                resolve();
            });
        });
    }
}

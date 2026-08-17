export class SettingsService {
    defaultSettings = {
        customDomain: 'www',
        defaultProjectKey: 'jira',
        boardUrl: '',
        useSmartNavigation: true,
        showDueDateAlert: true,
        myIssuesJql: 'statusCategory != Done AND status != Rejected',
        includeTodoInDefaultView: true,
        // Extra fields "search by user" also matches (in addition to Assignee/Reporter),
        // e.g. a "QA Assignee" person-picker field - up to 3, { id, name } each. name is
        // resolved automatically from the field id (see JiraHttpService.fetchFieldInfo),
        // not user-entered.
        additionalUserFields: [
            { id: 'customfield_12986', name: 'QA Assignee' },
        ],
        useSmartNavigationExtended: false,
        showBoardDebugIndicator: false,
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


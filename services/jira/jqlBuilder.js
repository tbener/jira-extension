import { MessageActionTypes } from "../../enum/message-action-types.enum.js";

export class JqlBuilder {

    static JQL_TEMPLATES = {
        ASSIGNED_TO_ME: 'assignee = currentUser() AND statusCategory in ("In Progress") AND project = "{PROJECT}" ORDER BY updated DESC',
        KEY_LIST: 'key in ({KEYS}) ORDER BY updated DESC'
    };
    
    static async _fetchSettings() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: MessageActionTypes.GET_SETTINGS }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response.settings);
                }
            });
        });
    };

    static async jqlMyIssues() {
        try {
            const settings = await JqlBuilder._fetchSettings();
            return this.JQL_TEMPLATES.ASSIGNED_TO_ME.replace("{PROJECT}", settings.defaultProjectKey);
        } catch (error) {
            console.log("ERROR:", error);
        }
    }

    static async jqlByKeyList(keys) {
        try {
            return this.JQL_TEMPLATES.KEY_LIST.replace("{KEYS}", keys.join(','));
        } catch (error) {
            console.log("ERROR:", error);
        }
    }
}
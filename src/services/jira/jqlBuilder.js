
export class JqlBuilder {

    static JQL_TEMPLATES = {
        ASSIGNED_TO_ME: 'assignee = currentUser() AND {CUSTOM_JQL} {IN_PROJECT} ORDER BY updated DESC',
        KEY_LIST: 'key in ({KEYS}) ORDER BY updated DESC',
        TEXT_SEARCH: 'textfields ~ "{TEXT}*" {IN_PROJECT} ORDER BY updated DESC',

        IN_PROJECT: 'AND project = "{PROJECT}"',
    };

    static async jqlMyIssues(project, customJql) {
        const projCondition = project ?
            this.JQL_TEMPLATES.IN_PROJECT.replace("{PROJECT}", project)
            : '';
        return this.JQL_TEMPLATES.ASSIGNED_TO_ME
            .replace("{CUSTOM_JQL}", customJql)
            .replace("{IN_PROJECT}", projCondition);
    }

    static async jqlByKeyList(keys) {
        try {
            return this.JQL_TEMPLATES.KEY_LIST.replace("{KEYS}", keys.join(','));
        } catch (error) {
            console.log("ERROR:", error);
        }
    }

    static async jqlTextSearch(text, project) {
        const projCondition = project ?
            this.JQL_TEMPLATES.IN_PROJECT.replace("{PROJECT}", project)
            : '';
        const escapedText = text.replace(/"/g, '\\"');
        return this.JQL_TEMPLATES.TEXT_SEARCH
            .replace("{TEXT}", escapedText)
            .replace("{IN_PROJECT}", projCondition);
    }
}

export class JqlBuilder {

    static JQL_TEMPLATES = {
        ASSIGNED_TO_ME: 'assignee = currentUser() AND statusCategory in ("In Progress") {IN_PROJECT} ORDER BY updated DESC',
        KEY_LIST: 'key in ({KEYS}) ORDER BY updated DESC',

        IN_PROJECT: 'AND project = "{PROJECT}"',
    };

    static async jqlMyIssues(project) {
        const projCondition = project ?
            this.JQL_TEMPLATES.IN_PROJECT.replace("{PROJECT}", project)
            : '';
        return this.JQL_TEMPLATES.ASSIGNED_TO_ME.replace("{IN_PROJECT}", projCondition);
    }

    static async jqlByKeyList(keys) {
        try {
            return this.JQL_TEMPLATES.KEY_LIST.replace("{KEYS}", keys.join(','));
        } catch (error) {
            console.log("ERROR:", error);
        }
    }
}
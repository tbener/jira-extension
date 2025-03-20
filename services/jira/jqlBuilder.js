export class JqlBuilder {
    JQL_TEMPLATES = {
        ASSIGNED_TO_ME: 'assignee = currentUser() AND statusCategory in ("In Progress") AND project = "{PROJECT}" ORDER BY updated DESC',
        KEY_LIST: 'key in ({KEYS}) ORDER BY updated DESC'
    };

    project = '';

    constructor(project) {
        this.project = project;
    }

    myIssues() {
        return this.JQL_TEMPLATES.ASSIGNED_TO_ME.replace("{PROJECT}", this.project);
    }

    byKeyList(keys) {
        return this.JQL_TEMPLATES.KEY_LIST.replace("{KEYS}", keys.join(','));
    }
}
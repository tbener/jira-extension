
export class JqlBuilder {

    static JQL_TEMPLATES = {
        ASSIGNED_TO_ME: 'assignee = currentUser() AND {CUSTOM_JQL} {IN_PROJECT} ORDER BY updated DESC',
        KEY_LIST: 'key in ({KEYS}) ORDER BY updated DESC',
        TEXT_SEARCH: 'textfields ~ "{TEXT}*" {IN_PROJECT} ORDER BY updated DESC',
        USER_SEARCH: '({ROLE_CONDITIONS}) {IN_PROJECT} ORDER BY updated DESC',

        IN_PROJECT: 'AND project = "{PROJECT}"',
    };

    static DEFAULT_USER_SEARCH_ROLES = ['assignee', 'reporter'];

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

    // roleFields are JQL role names (assignee/reporter) and/or custom field ids
    // (customfield_12345 or bare 12345, e.g. a configurable QA-assignee field) -
    // array-driven so appending an extra field is a one-line change, not a template rewrite.
    static async jqlUserSearch(accountId, project, roleFields = this.DEFAULT_USER_SEARCH_ROLES) {
        const roleConditions = roleFields
            .map(field => this._roleCondition(field, accountId))
            .join(' OR ');
        const projCondition = project ?
            this.JQL_TEMPLATES.IN_PROJECT.replace("{PROJECT}", project)
            : '';
        return this.JQL_TEMPLATES.USER_SEARCH
            .replace("{ROLE_CONDITIONS}", roleConditions)
            .replace("{IN_PROJECT}", projCondition);
    }

    static _roleCondition(field, accountId) {
        const customFieldMatch = /^(?:customfield_)?(\d+)$/.exec(field);
        const fieldRef = customFieldMatch ? `cf[${customFieldMatch[1]}]` : field;
        return `${fieldRef} = "${accountId}"`;
    }
}
export class Issue {
    constructor(issue, overrideFields = {}) {
        if (!issue) {
            return;
        }
        
        this.id = issue.id || '';
        this.key = issue.key || '';
        this.summary = issue.fields?.summary || '';
        this.status = issue.fields?.status?.name || '---';
        this.assignee = issue.fields?.assignee?.displayName || null;
        this.assigneeIconUrl = issue.fields?.assignee?.avatarUrls?.['16x16'] || null;
        this.created = issue.fields?.created || null;
        this.updated = issue.fields?.updated || null;
        this.assignedToMe = false;
        this.hasOpenTab = false;
        this.isUpdated = true;

        // Override fields if provided
        Object.assign(this, overrideFields);
    }
}

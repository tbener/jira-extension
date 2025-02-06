import {injectable, singleton} from 'tsyringe';
import SettingsHandler from "../common/settings";

export interface Issue {
    key: string;
    summary: string;
    link: string;
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

@singleton()
@injectable()
export default class JiraService {
    private username = 'tbener@gmail.com'
    private password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';
    private abortController: AbortController | null = null;

    constructor(private settingsService: SettingsHandler) { }

    public getIssueKeyByInput(input: string): string {
        if (input === '') return '';

        if (/^[A-Za-z]+-\d+$/.test(input)) {
            // the input is in full format, return it as is
            return input
        }

        if (isNaN(Number(input))) {
            // not a number and not in key format
            return ''
        }

        // input is only the number
        return `${this.settingsService.settings.defaultProjectKey}-${input}`;
    }

    private getIssueLink(issueKey: string): string {
        return `https://${this.settingsService.settings.customDomain}.atlassian.net/browse/${issueKey}`;
    }

    public navigateToIssue(issueKey: string, newWindow: boolean = true): void {
        const url: string = this.getIssueLink(issueKey);

        // Navigate to the Jira issue page
        if (newWindow) {
            chrome.tabs.create({ url });
        } else {
            chrome.tabs.update({ url });
        }
    }

    public async fetchIssue(issueKey: string): Promise<Result<Issue>> {
        if (this.abortController) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        const apiGetPath: string = `https://${this.settingsService.settings.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;

        try {
            const response: Response = await fetch(apiGetPath, {
                credentials: 'include',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
                },
                signal: signal
            });

            return this.getIssueFromResponse(response);
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.debug('Fetch aborted');
            } else {
                console.error('Fetch error:', error);
            }
            throw error;
        }
    }

    public abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private async getIssueFromResponse(response: Response): Promise<Result<Issue>> {
        if (!response.ok) {
            let error: string = response.status === 404 ? 'Not found' : `Status ${response.status}`
            return { success: false, error };
        }

        const data = await response.json();
        return {
            success: true,
            data: {
                key: data.key,
                summary: data.fields.summary,
                link: this.getIssueLink(data.key)
            }
        };
    }

}

/*

const JiraService2 = (() => {
    const username = 'tbener@gmail.com'
    const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

    abortController = null
    settings = {};

    SettingsHandler.getSettings().then(sett => {
        this.settings = sett;
    });



    const getIssueKeyByInput = (input) => {
        if (input === '') return '';

        if (/^[A-Za-z]+-\d+$/.test(input)) {
            // the input is in full format, return it as is
            return input
        }

        if (isNaN(input)) {
            // not a number and not in key format
            return ''
        }

        // input is only the number
        return `${this.settings.defaultProjectKey}-${input}`;
    }

    const getIssueLink = (issueKey) => {
        return `https://${this.settings.customDomain}.atlassian.net/browse/${issueKey}`;
    }

    const navigateToIssue = (issueKey, newWindow = true) => {

        const url = getIssueLink(issueKey);

        // Navigate to the Jira issue page
        if (newWindow) {
            chrome.tabs.create({ url });
        } else {
            chrome.tabs.update({ url });
        }
    };

    const fetchIssue = (issueKey) => {
        if (this.abortController) {
            this.abortController.abort();
        }

        abortController = new AbortController();
        const signal = abortController.signal;

        const apiGetPath = `https://${this.settings.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;

        const responsePromise = fetch(apiGetPath, {
            credentials: 'include',
            headers: {
                'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
            },
            signal: signal
        });

        return responsePromise
            .then(response => {
                return getIssueFromResponse(response);
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    console.debug('Fetch aborted');
                } else {
                    console.error('Fetch error:', error);
                }
            });
    }

    const abort = () => {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    const getIssueFromResponse = async (response) => {
        if (!response.ok) {
            if (response.status === 404) {
                return {
                    error: 'Not found'
                }
            } else {
                return {
                    error: `Status ${response.status}`
                }
            }
        }
        const data = await response.json();
        return {
            key: data.key,
            summary: data.fields.summary,
            link: getIssueLink(data.key)
        }
    }

    return {
        getIssueKeyByInput,
        navigateToIssue,
        fetchIssue,
        abort
    }

})();


window.JiraService = JiraService;*/

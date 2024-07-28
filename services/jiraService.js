
const JiraService = (() => {
    username = 'tbener@gmail.com'
    password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

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


window.JiraService = JiraService;
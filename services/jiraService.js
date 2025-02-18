
const JiraService = (() => {
    username = 'tbener@gmail.com'
    password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

    abortController = null
    settings = {};

    let baseUrl = '';

    SettingsHandler.getSettings().then(sett => {
        this.settings = sett;

        baseUrl = `https://${this.settings.customDomain}.atlassian.net`


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

    const getBoardLink = () => {
        const r = guessBoardLink(this.settings.defaultProjectKey);
        console.debug('getBoardLink', r);
        return `https://${this.settings.customDomain}.atlassian.net/jira/software/c/projects/${this.settings.defaultProjectKey}/boards/183`
    }

    const guessBoardLink = async (domain, projectKey) => {
        const baseUrl = `https://${domain}.atlassian.net`;
        const apiGetPath = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;

        try {
            const response = await fetch(apiGetPath, {
                credentials: 'include',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
                }
            });

            if (!response.ok) {
                console.debug(`Failed to fetch boards: HTTP ${response.status} ${response.statusText}`);
                return baseUrl;
            }

            const data = await response.json();
            const board = data.values?.find(b => b.type === 'kanban' && b.location.projectKey === projectKey);

            return board
                ? `${baseUrl}/jira/software/c/projects/${projectKey}/boards/${board.id}`
                : baseUrl; // Return base URL if no board is found

        } catch (error) {
            console.debug(`Error fetching board:`, error);
            return baseUrl; // If fetch throws an error, return base URL silently
        }
    };


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
        abort,
        guessBoardLink
    }

})();


window.JiraService = JiraService;
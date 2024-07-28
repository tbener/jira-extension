const username = 'tbener@gmail.com'
const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

let settings = {};

SettingsHandler.getSettings().then(sett => {
    settings = sett;
});

const JiraService = (() => {
    let abortController = null

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
        return `${settings.defaultProjectKey}-${input}`;
    }

    const fetchIssue = (issueKey) => {
        if (this.abortController) {
            this.abortController.abort();
        }

        abortController = new AbortController();
        const signal = abortController.signal;

        const apiGetPath = `https://${settings.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;

        const responsePromise = fetch(apiGetPath, {
            credentials: 'include',
            headers: {
                'Authorization': 'Basic ' + btoa(`${username}:${password}`)
            },
            signal: signal
        });

        return responsePromise
            .then(response => {
                return getIssueFromResponse(response);
            //     if (!response.ok) {
            //         throw new Error(`Failed to fetch issue details. Status: ${response.status}`);
            //     }
            //     return response.json();
            // })
            // .then(data => {
            //     console.debug('DATA: ', data);
            //     const summary = data.fields.summary;
            //     return issueKey.toUpperCase() + ': ' + summary;
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    console.log('Fetch aborted');
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
            link: 'chrome:blank',
        }
    }

    return {
        getIssueKeyByInput,
        fetchIssue,
        abort
    }

})();


window.JiraService = JiraService;
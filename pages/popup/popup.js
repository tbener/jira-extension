let typingTimer;
let latestRequest = 0;

const issueInputElement = document.getElementById('issue');
const previewElementLink = document.getElementById('preview-link');
const previewElementError = document.getElementById('preview-error');

SettingsHandler.getSettings().then(settings => {
    document.getElementById('default_project_key').textContent = settings.defaultProjectKey;
    document.getElementById('version').textContent = settings.versionDisplay;
});

const navigateToIssue = (newWindow = true) => {
    const issueKey = JiraService.getIssueKeyByInput(issueInputElement.value.trim());
    JiraService.navigateToIssue(issueKey, newWindow);
    if (!newWindow) {
        window.close();
    }
};

const setPreview = async () => {
    const currentRequest = ++latestRequest; // Increment and get the latest request number
    const issueKey = JiraService.getIssueKeyByInput(issueInputElement.value.trim());

    if (issueKey === '') {
        return;
    }

    try {
        const issue = await JiraService.fetchIssue(issueKey);
        console.debug('ISSUE: ', issue);
        if (currentRequest === latestRequest && issue) { // Ensure this is the latest request
            if (issue.error) {
                previewElementError.textContent = issue.error;
            } else {
                previewElementLink.textContent = `${issue.key.toUpperCase()}: ${issue.summary}`;
                previewElementLink.href = issue.link;
            }
        }
    } catch (error) {
        // do nothing
    }
};

const clearPreview = () => {
    previewElementLink.textContent = '';
    previewElementLink.href = '#';
    previewElementError.textContent = '';
}

issueInputElement.addEventListener('input', async function () {
    JiraService.abort(); // Always abort the previous request

    clearTimeout(typingTimer);
    clearPreview();

    typingTimer = setTimeout(async () => {
        await setPreview();
    }, 200);
});

issueInputElement.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'Enter') {
        navigateToIssue(false);
    }
});

document.getElementById('goButton').addEventListener('click', navigateToIssue);

document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});
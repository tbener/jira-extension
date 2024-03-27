let settings = {};

SettingsHandler.getSettings().then(sett => {
    settings = sett;
    document.getElementById('default_project_key').textContent = settings.defaultProjectKey;
    document.getElementById('version').textContent = settings.versionDisplay;
});

const navigateToIssue = () => {
    let issue = document.getElementById('issue').value;
    if (!isNaN(issue)) {
        // only a number
        issue = `${settings.defaultProjectKey}-${issue}`;
    }

    const url = `https://${settings.customDomain}.atlassian.net/browse/${issue}`;

    // Navigate to the Jira issue page
    chrome.tabs.create({ url });
};

document.getElementById('goButton').addEventListener('click', navigateToIssue);


document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});
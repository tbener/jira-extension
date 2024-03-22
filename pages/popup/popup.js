const navigateToIssue = () => {
    chrome.storage.sync.get(
        { customDomain: 'mdclone', defaultProjectKey: 'adams' },
        (items) => {
            let issue = document.getElementById('issue').value;
            if (!isNaN(issue)) {
                // only a number
                issue = `${items.defaultProjectKey}-${issue}`;
            }

            const url = `https://${items.customDomain}.atlassian.net/browse/${issue}`;

            // Navigate to the Jira issue page
            chrome.tabs.create({ url });
        }
    );
};

document.getElementById('goButton').addEventListener('click', navigateToIssue);

document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});
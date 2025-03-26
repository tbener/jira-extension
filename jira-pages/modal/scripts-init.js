(async () => {
    const module = await import(chrome.runtime.getURL("jira-pages/common/add-copy-link.js"));
    module.default?.('div.atlaskit-portal-container', getIssue, true);
})();

function getIssue() {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('selectedIssue');
}
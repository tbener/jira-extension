(async () => {
    // const module = await import(chrome.runtime.getURL("jira-pages/common/add-copy-link.js"));
    // module.default?.('div.atlaskit-portal-container', getIssue, true);

    const pageWatcher = await import(chrome.runtime.getURL("jira-pages/common/page-watcher.js"));
    pageWatcher.default?.('modal');
})();

// function getIssue() {
//     const queryParams = new URLSearchParams(window.location.search);
//     return queryParams.get('selectedIssue');
// }
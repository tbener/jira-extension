(async () => {
    // const module = await import(chrome.runtime.getURL("jira-pages/common/add-copy-link.js"));
    // module.default?.('', getIssue);

    const pageWatcher = await import(chrome.runtime.getURL("jira-pages/common/page-watcher.js"));
    pageWatcher.default?.('page');
})();

// function getIssue() {
//     return window.location.pathname.split('/').pop();
// }
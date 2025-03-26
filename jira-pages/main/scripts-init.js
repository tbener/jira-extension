(async () => {
    const module = await import(chrome.runtime.getURL("jira-pages/common/add-copy-link.js"));
    module.default?.('', getIssue);
})();

function getIssue() {
    return window.location.pathname.split('/').pop();
}

window.addEventListener('load', function () {
    this.window.CopyIssueKeyWithTitle.init(document.querySelector('div.atlaskit-portal-container'), getIssue, true);
});

function getIssue() {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('selectedIssue');
}

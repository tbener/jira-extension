
window.addEventListener('load', function () {
    new CopyLink(document.querySelector('div.atlaskit-portal-container'), getIssue, true);
});

function getIssue() {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('selectedIssue');
}

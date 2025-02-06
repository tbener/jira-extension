
window.addEventListener('load', function () {
    this.window.CopyIssueKeyWithTitle.init('', getIssue);
});

function getIssue() {
    return window.location.pathname.split('/').pop();
}

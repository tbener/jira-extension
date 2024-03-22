
window.addEventListener('load', function () {
    this.window.CopyIssueKeyWithTitle.init(document.body, getIssue);
});

function getIssue() {
    return window.location.pathname.split('/').pop();
}

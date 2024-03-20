
window.addEventListener('load', function () {
    new CopyLink(document.body, getIssue);
});

function getIssue() {
    return window.location.pathname.split('/').pop();
}

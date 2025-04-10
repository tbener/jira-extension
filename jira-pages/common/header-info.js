export function addHeaderInfo(refElement, issue) {
    if (!refElement || !(refElement instanceof HTMLElement)) {
        throw new Error("Invalid target element provided.");
    }

    const existingDiv = refElement.parentNode.querySelector('.extension-header-info');
    if (existingDiv) {
        existingDiv.textContent = issue.key;
        return;
    }
    const newDiv = document.createElement('div');
    newDiv.className = 'extension-header-info';
    newDiv.textContent = issue.key;

    if (refElement.nextSibling) {
        refElement.parentNode.insertBefore(newDiv, refElement.nextSibling);
    } else {
        refElement.parentNode.appendChild(newDiv);
    }
}
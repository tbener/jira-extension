export function addHeaderInfo(refElement, issue) {
    if (!refElement || !(refElement instanceof HTMLElement)) {
        throw new Error("Invalid target element provided.");
    }

    const newDiv = document.createElement('div');
    newDiv.textContent = issue.key;

    if (refElement.nextSibling) {
        refElement.parentNode.insertBefore(newDiv, refElement.nextSibling);
    } else {
        refElement.parentNode.appendChild(newDiv);
    }
}
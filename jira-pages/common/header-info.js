const dueDateInfo = {
    statuses: {
        "analysis": {
            dueDateField: "customfield_12047",
            message: (dueDate) => dueDate ? `Analysis Due Date: ${dueDate}` : "No analysis due date."
        },
        "in dev": {
            dueDateField: "customfield_12048",
            message: (dueDate) => dueDate ? `Dev Due Date: ${dueDate}` : "No dev due date."
        },
        "qa": {
            dueDateField: "customfield_12049",
            message: (dueDate) => dueDate ? `QA Due Date: ${dueDate}` : "No QA due date."
        }
    }
};

export class HeaderInfo {
    addDueDateInfo(refElement, issue) {
        if (!refElement || !(refElement instanceof HTMLElement)) {
            throw new Error("Invalid target element provided.");
        }

        let statusInfo;
        if (issue.fields.issuetype?.name?.toLowerCase() === "story") {
            const status = issue.fields.status?.name?.toLowerCase();
            statusInfo = dueDateInfo.statuses[status];
        }

        if (!statusInfo) {
            // Do not display anything for other statuses
            // Remove any existing status info div
            const existingDiv = refElement.parentNode.querySelector(".extension-status-info");
            if (existingDiv) {
                existingDiv.remove();
            }
            return;
        }

        const dueDate = issue.fields[statusInfo.dueDateField];
        const message = statusInfo.message(dueDate);
        const className = dueDate ? "header-message" : "header-message-no-duedate";

        const div = this.getOrCreateDiv(refElement, "extension-status-info");
        div.textContent = message;
        div.className = `extension-status-info ${className}`;
    }

    getOrCreateDiv(refElement, baseClassName) {
        let div = refElement.parentNode.querySelector(`.${baseClassName}`);
        if (!div) {
            div = document.createElement('div');
            if (refElement.nextSibling) {
                refElement.parentNode.insertBefore(div, refElement.nextSibling);
            } else {
                refElement.parentNode.appendChild(div);
            }
        }
        return div;
    }
}

export function addHeaderInfo(refElement, issue) {
    if (!refElement || !(refElement instanceof HTMLElement)) {
        throw new Error("Invalid target element provided.");
    }

    const div = getOrCreateDiv(refElement, "extension-header-info");
    div.textContent = issue.key;
    div.className = "extension-header-info";
}

function getOrCreateDiv(refElement, baseClassName) {
    let div = refElement.parentNode.querySelector(`.${baseClassName}`);
    if (!div) {
        div = document.createElement('div');
        if (refElement.nextSibling) {
            refElement.parentNode.insertBefore(div, refElement.nextSibling);
        } else {
            refElement.parentNode.appendChild(div);
        }
    }
    return div;
}
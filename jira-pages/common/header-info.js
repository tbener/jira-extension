import { formatDate } from "../../common/utils.js";

const dueDateInfo = {
    classes: {
        headerMessageContainer: "header-message-container",
        headerMessage: "header-message",
        headerMessageDueDate: "has-due-date",
        headerMessageNoDueDate: "no-due-date"
    },
    statuses: {
        "analyze": {
            dueDateField: "customfield_12047",
            message: (dueDate) => dueDate ? `Analysis Due Date: ${formatDate(dueDate)}` : "No analysis due date."
        },
        "in dev": {
            dueDateField: "customfield_12048",
            message: (dueDate) => dueDate ? `Dev Due Date: ${formatDate(dueDate)}` : "No dev due date."
        },
        "qa": {
            dueDateField: "customfield_12049",
            message: (dueDate) => dueDate ? `QA Due Date: ${formatDate(dueDate)}` : "No QA due date."
        }
    }
};

export class HeaderInfo {
    addDueDateInfo(refElement, issue) {
        if (!refElement || !(refElement instanceof HTMLElement)) {
            throw new Error("Invalid target element provided.");
        }

        console.debug("Adding due date info to header:", issue.key);
        console.debug("Issue type:", issue.fields.issuetype?.name?.toLowerCase());
        console.debug("Issue status:", issue.fields.status?.name?.toLowerCase());
        let statusInfo;
        if (issue.fields.issuetype?.name?.toLowerCase() === "story") {
            const status = issue.fields.status?.name?.toLowerCase();
            statusInfo = dueDateInfo.statuses[status];
        }

        if (!statusInfo) {
            // Do not display anything for other statuses
            // Remove any existing status info div
            const existingDiv = refElement.parentNode.querySelector(`.${dueDateInfo.classes.headerMessageContainer}`);
            if (existingDiv) {
                existingDiv.remove();
            }
            return;
        }

        const dueDate = issue.fields[statusInfo.dueDateField];
        const message = statusInfo.message(dueDate);
        const dueDateClassName = dueDate ? dueDateInfo.classes.headerMessageDueDate : dueDateInfo.classes.headerMessageNoDueDate;

        const div = this.getOrCreateDiv(refElement);
        div.textContent = message;
        div.classList.add(dueDateClassName);
    }

    getOrCreateDiv(refElement) {
        let containerDiv = refElement.parentNode.querySelector(`.${dueDateInfo.classes.headerMessageContainer}`);
        if (!containerDiv) {
            containerDiv = document.createElement('div');
            containerDiv.className = dueDateInfo.classes.headerMessageContainer;
            if (refElement.nextSibling) {
                refElement.parentNode.insertBefore(containerDiv, refElement.nextSibling);
            } else {
                refElement.parentNode.appendChild(containerDiv);
            }
        }

        let div = containerDiv.querySelector(`.${dueDateInfo.classes.headerMessage}`);
        if (!div) {
            div = document.createElement('div');
            containerDiv.appendChild(div);
        }
        div.className = dueDateInfo.classes.headerMessage;
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

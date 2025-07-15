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
            displayName: "Analysis",
            dueDateField: "customfield_12047",
        },
        "in dev": {
            displayName: "Dev",
            dueDateField: "customfield_12048",
        },
        "qa": {
            displayName: "QA",
            dueDateField: "customfield_11532",
        }
    }
};

export class HeaderInfo {
    settings = null;
    
    constructor(settings) {
        this.settings = settings;
    }

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
        const message = this.generateDueDateMessage(statusInfo.displayName, dueDate);
        const dueDateClassName = dueDate ? dueDateInfo.classes.headerMessageDueDate : dueDateInfo.classes.headerMessageNoDueDate;

        const div = this.getOrCreateDiv(refElement);
        div.textContent = message;
        div.classList.add(dueDateClassName);
    }

    generateDueDateMessage(status, dueDate) {
        const templates = this.settings.dueDateOptions.messageTemplate;
        const msgTemplate = dueDate ? templates.with : templates.without;
        const message = msgTemplate
            .replace("{status}", status)
            .replace("{date}", dueDate ? formatDate(dueDate) : "missing");
        console.debug("Message:", message);
        return message;
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

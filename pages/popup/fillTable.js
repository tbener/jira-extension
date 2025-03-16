export function fillIssuesTable(issuesList, containerElement) {
    if (!containerElement) {
        console.error("Container element not found!");
        return;
    }

    const tbody = containerElement.querySelector("tbody");
    if (!tbody) {
        console.error("Tbody not found in table!");
        return;
    }

    const issueTemplate = tbody.querySelector(".jira-issue");
    if (!issueTemplate) {
        console.error("Issue template row not found!");
        return;
    }

    tbody.innerHTML = "";

    issuesList.forEach(issue => {
        const issueElement = issueTemplate.cloneNode(true);
        issueElement.classList.remove("d-none");

        issueElement.setAttribute("data-issue-key", issue.key);

        issueElement.querySelector(".jira-key").textContent = issue.key;
        issueElement.querySelector(".jira-summary").textContent = issue.summary;
        issueElement.querySelector(".jira-status").textContent = issue.status;

        if (issue.assignedToMe) {
            issueElement.classList.add("jira-my-issue");
            issueElement.setAttribute("title", "Assigned to you");
        }

        if (issue.hasOpenTab) {
            issueElement.classList.add("has-open-tab");
        }

        tbody.appendChild(issueElement);
    });
}

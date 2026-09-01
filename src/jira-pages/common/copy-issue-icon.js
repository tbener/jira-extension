
const parentElementSelector = 'div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]';

// Candidates for the issue's summary heading, tried in order. Kept as a list (rather than
// a single selector) since Jira can change/vary its data-testid, and getting this wrong
// falls back to the summary fetched via the API instead of throwing.
const summaryHeadingSelectors = [
    'h1[data-testid="issue.views.issue-base.foundation.summary.heading"]',
    '[data-testid$="summary.heading"]',
];

export class CopyIssueIcon {

    copyLinkSvg = this.buildCopyLinkSvg(jiraLinkSvg);

    createButton(refElement, issueKey, issueLink, issuePromise) {
        const parentElement = document.querySelector(parentElementSelector);
        const existingElement = parentElement.querySelector('.extension-copy-link-button');
        if (existingElement) {
            existingElement.remove();
        }
        const buttonElement = parentElement.querySelector('button');
        this.iconButton = buttonElement.cloneNode(true);
        const svgParent = this.iconButton.querySelector('svg').parentNode;
        svgParent.innerHTML = this.copyLinkSvg;

        svgParent.style.marginLeft = '5px';
        this.iconButton.classList.add('extension-copy-link-button');
        parentElement.appendChild(this.iconButton);

        this.iconButton?.addEventListener('click', () => {
            this.copyLinkToClipboard(issueLink, issueKey, issuePromise);
        });

        console.debug('Copy-link button created');
    }

    // Reads the summary straight from the DOM (rather than from a value fetched via the
    // API when the button was created) so a rename is always reflected, and so this
    // doesn't depend on a fetch that could resolve after the user has navigated to a
    // different issue. Falls back to the API-fetched issue if none of the known selectors
    // match - logged as an error since that means Jira's markup has changed and the
    // selectors above need updating.
    async getIssueSummary(issueKey, issuePromise) {
        for (const selector of summaryHeadingSelectors) {
            const text = document.querySelector(selector)?.textContent?.trim();
            if (text) return text;
        }

        console.error('Copy-link: summary heading not found in DOM for', issueKey, '- tried selectors:', summaryHeadingSelectors, '- falling back to the fetched issue. Jira\'s markup may have changed and these selectors need updating.');
        try {
            const issue = await issuePromise;
            return issue?.fields?.summary ?? '';
        } catch (error) {
            console.error('Copy-link: fallback issue fetch also failed for', issueKey, error);
            return '';
        }
    }

    async copyLinkToClipboard(issueLink, issueKey, issuePromise) {
        const issueSummary = await this.getIssueSummary(issueKey, issuePromise);
        const htmlContent = `<a href="${issueLink}">${issueKey}</a> - ${issueSummary}`;
        const textContent = `${issueKey} - ${issueSummary}`;

        navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            })
        ])
            .then(() => {
                this.showResultIcon(true);
                console.debug('HTML content copied to clipboard:', htmlContent);
            })
            .catch(error => {
                this.showResultIcon(false);
                console.error('Error copying HTML content to clipboard:', error);
            });
    }

    showResultIcon(isSuccess) {
        const svgParent = this.iconButton.querySelector('svg').parentNode;
        svgParent.innerHTML = isSuccess ? checkmarkSvg : errorSvg;

        // Set a timer to revert the icon and class back to the original after 2 seconds (2000 milliseconds)
        setTimeout(() => {
            svgParent.innerHTML = this.copyLinkSvg;
        }, 2000);
    }

    buildCopyLinkSvg(jiraSvg) {
        const match = jiraSvg.match(/<path[^>]+d="[^"]+"[^>]*>/g);
        if (!match) return null;

        const jiraPaths = match.join('\n');
        const transform = `scale(1.2) translate(2 2)`;

        const copyLinkSvg = `
            <svg height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(0 -1028.4)">
                <path d="m12 1028.4 4 9 8 1-6 5 2 9-8-5-8 5 2-9-6-5 8-1z" fill="var(--star-outer-color)"/>
                <path d="m12 1028.4-4 9-6.9688 0.8 4.9688 4.2-0.1875 0.8 0.1875 0.2-1.75 7.8 7.75-4.8 7.75 4.8-1.75-7.8 0.188-0.2-0.188-0.8 4.969-4.2-6.969-0.8-4-9z" fill="var(--star-inner-color)"/>
                </g>
                <g fill="currentColor" fill-rule="evenodd" transform="${transform}">
                ${jiraPaths}
                </g>
            </svg>`.trim();

        console.debug('Copy-link SVG:', copyLinkSvg);

        return copyLinkSvg;
    }
}

const iconSize = 18;

const jiraLinkSvg = `<svg fill="none" viewBox="0 0 16 16" role="presentation" class="_1reo15vq _18m915vq _syaz1r31 _lcxvglyw _s7n4yfq0 _vc881r31 _1bsbpxbi _4t3ipxbi">
<path fill="currentcolor" fill-rule="evenodd" d="M8.22 2.22a3.932 3.932 0 1 1 5.56 5.56l-2.25 2.25-1.06-1.06 2.25-2.25a2.432 2.432 0 0 0-3.44-3.44L7.03 5.53 5.97 4.47zm3.06 3.56-5.5 5.5-1.06-1.06 5.5-5.5zM2.22 8.22l2.25-2.25 1.06 1.06-2.25 2.25a2.432 2.432 0 0 0 3.44 3.44l2.25-2.25 1.06 1.06-2.25 2.25a3.932 3.932 0 1 1-5.56-5.56" clip-rule="evenodd">
</path></svg>`

const checkmarkSvg = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="#2ecc71"/>
<path d="M9 14l-2.5-2.5-1.5 1.5 4 4 8-8-1.5-1.5L9 14z" fill="#ffffff"/>
</svg>`;

const errorSvg = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="#e74c3c"/>
<path d="M14.828 14.828l-2.828-2.828-2.828 2.828-1.414-1.414 2.828-2.828-2.828-2.828 1.414-1.414 2.828 2.828 2.828-2.828 1.414 1.414-2.828 2.828 2.828 2.828-1.414 1.414z" fill="#ffffff"/>
</svg>`;

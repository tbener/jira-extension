
const parentElementSelector = 'div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]';

export class CopyIssueIcon {

    copyLinkSvg = this.buildCopyLinkSvg(jiraLinkSvg);

    createButton(refElement, issue, issueLink) {
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
            this.copyLinkToClipboard(issueLink, issue.key, issue.fields.summary);
        });

        console.debug('Copy-link button created');
    }

    copyLinkToClipboard(issueLink, issueKey, issueSummary) {
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
                <path d="m12 1028.4 4 9 8 1-6 5 2 9-8-5-8 5 2-9-6-5 8-1z" fill="#f39c12"/>
                <path d="m12 1028.4-4 9-6.9688 0.8 4.9688 4.2-0.1875 0.8 0.1875 0.2-1.75 7.8 7.75-4.8 7.75 4.8-1.75-7.8 0.188-0.2-0.188-0.8 4.969-4.2-6.969-0.8-4-9z" fill="#f1c40f"/>
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


var maxRetries = 5

window.addEventListener('load', function () {
    createCopyLinkElement();
});

function createCopyLinkElement(retryCount = 1) {
    const elmContainer = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]');

    if (!elmContainer) {
        console.log(`Parent element in breadcrumbs not found, retry: ${retryCount}`);
        if (retryCount < maxRetries) {
            // If breadcrumbs are not found and retries remaining, try again after a timeout
            setTimeout(function () {
                createCopyLinkElement(retryCount + 1);
            }, 2000); // Retry after 2 seconds
        } else {
            console.log(`Maximum retries exceeded (${maxRetries}). Breadcrumbs not found.`);
        }
    } else {
        console.log(`Parent element in breadcrumbs found, retry: ${retryCount}`);

        // Parent element found, proceed...
        createButton(elmContainer);

    }
}

function createButton(parentElement) {
    const buttonElement = parentElement.querySelector('button');
    const clonedButton = buttonElement.cloneNode(true);
    const svgParent = clonedButton.querySelector('svg').parentNode;
    svgParent.innerHTML = newSvg;
    parentElement.appendChild(clonedButton).appendChild;

    clonedButton?.addEventListener('click', () => {
        const issueKey = window.location.pathname.split('/').pop();

        const copyLink = new CopyLink();
        copyLink.createLink(issueKey);
    });
}

const newSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(0 -1028.4)">
<path d="m12 1028.4 4 9 8 1-6 5 2 9-8-5-8 5 2-9-6-5 8-1z" fill="#f39c12"/>
<path d="m12 1028.4-4 9-6.9688 0.8 4.9688 4.2-0.1875 0.8 0.1875 0.2-1.75 7.8 7.75-4.8 7.75 4.8-1.75-7.8 0.188-0.2-0.188-0.8 4.969-4.2-6.969-0.8-4-9z" fill="#f1c40f"/>
</g>
<g fill="currentColor" fill-rule="evenodd">
<path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path>
<path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path>
</g>
</svg>
`


/////////////////////////////////////////////////////////////////////////////

// function appendCopyLinkElement() {

//     const breadcrumbs = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child');

//     const newElement = document.createElement('span');
//     newElement.classList.add('copy-icon')
//     newElement.appendChild(document.createTextNode('Copy'))

//     breadcrumbs?.appendChild(newElement);
//     return newElement;
// }

// function getContainerElement(retries) {
//     for (let i = 0; i < retries; i++) {
//         console.log(`Try ${i + 1}`);
//         elm = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]');
//         if (elm) {
//             console.log(`Found element`);
//             return elm;
//         }

//         setTimeout(() => {
//             elm = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]');

//         }, 3000);
//     }
// }

// function appendCopyLinkElementHover() {

//     const elmContainer = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]');

//     if (!elmContainer) {
//         console.log("elmContainer wasn't found");
//         return;
//     }

//     const buttonElement = elmContainer.querySelector('button');
//     const clonedButton = buttonElement.cloneNode(true);
//     const svgParent = clonedButton.querySelector('svg').parentNode;
//     svgParent.innerHTML = newSvg;
//     elmContainer.appendChild(clonedButton).appendChild;
//     return clonedButton;
// }



// const orgSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
// <g fill="currentColor" fill-rule="evenodd">
//   <!-- Original Path 1 -->
//   <path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"/>
//   <!-- Original Path 2 -->
//   <path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"/>
//   <!-- Plus Sign -->
//   <path d="M17 12H7m5-5v10" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
// </g>
// </svg>
// `;



// const button = `<div class="_tzy4idpf _v5641n2p _t9ecs3yl _19bv1b66 _1e0c1txw _4cvresu3 _1h7hkb7n _1bvq1xty _ca0qv77o issue_view_permalink_button_wrapper" data-testid="issue.common.component.permalink-button.button.copy-link-button-wrapper"><div class="sc-1g0si8d-0 llvtxA"><div class="sc-1g0si8d-1 ezniiT"><div role="presentation" data-ds--text-field--container="true" class="css-1s25hsw"><input aria-hidden="true" id="BreadcrumbCurrentIssue" label="Copy link to issue" tabindex="-1" data-ds--text-field--input="true" name="field-copy-text" readonly="" class="css-1cab8vv" value=""></div></div><span role="presentation"><button class="css-yjb2hd" tabindex="0" type="button" aria-describedby="99val-tooltip"><span class="css-18kgcs9"><span data-testid="issue.common.component.permalink-button.button.link-icon" role="img" aria-label="Copy link to issue" class="css-1wits42" style="--icon-primary-color: currentColor; --icon-secondary-color: var(--ds-surface, #FFFFFF);"><svg width="24" height="24" viewBox="0 0 24 24" role="presentation"><g fill="currentColor" fill-rule="evenodd"><path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path><path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path></g></svg></span></span></button></span></div></div>`
// const button = `<div class="issue_view_permalink_button_wrapper"><div><div>
// <div role="presentation">
// <input aria-hidden="true" id="BreadcrumbCurrentIssue1" label="Copy link to issue" tabindex="-1" name="field-copy-text" readonly="" value="">
// </div></div>
// <span role="presentation"><button tabindex="0" type="button" aria-describedby="99val-tooltip">
// <span><span role="img" aria-label="Copy link to issue" style="--icon-primary-color: currentColor; --icon-secondary-color: var(--ds-surface, #FFFFFF);">
//  <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
//  <g fill="currentColor" fill-rule="evenodd">
// <path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path><path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path></g></svg></span></span></button></span></div></div>`






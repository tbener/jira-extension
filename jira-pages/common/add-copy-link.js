import { CopyIssueKeyWithTitle } from '../common/copy-link.js';

export default async function initAddCopyLink(...args) {
    console.debug("✅ add-copy-link.js injected successfully.", `document.readyState = ${document.readyState}`);

    const handler = async () => {
        console.debug('✅ Init CopyIssueKeyWithTitle with args:', args);
        const addIconForCopy = new CopyIssueKeyWithTitle();
        await addIconForCopy.init(...args);
    };

    if (document.readyState === 'complete') {
        handler();
    } else {
        window.addEventListener('load', handler);
    }
}


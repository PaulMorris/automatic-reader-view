/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Contributor: Paul Morris.

'use strict';

// readerModeTabs: Stores tab.id and url as key/value pairs for
// all tabs currently in reader view mode (the stored url is sanitized
// and does not begin with 'about:reader?url=').  This lets us handle two cases.
// 1. When a tab is in reader view and the user clicks to get out
// of it.  In that case we do not convert back to reader view.
// 2. If the tab is in reader view and the user loads another url
// that should be loaded in reader view.  This is why it is a Map and not a Set
// of tab ids, so two back-to-back auto-reader-view pages will work correctly.
let readerModeTabs = new Map(),
    readerSites = [],
    openAllSitesInReader = false,
    nonReaderSites = [];

function cleanUrl(url) {
    // remove 'about:reader?url=' from RV urls and unescape ':' '/' etc.
    // remove trailing '?...' and '#...'
    const trimUrl = url.startsWith('about:reader?url=') ? url.slice(17) : url,
        urlObj = new URL(unescape(trimUrl));

    return urlObj.origin + urlObj.pathname;
}

function containsUrl(paths, url) {
    return paths.find((path) => url.startsWith(path));
}

// handle tab loading
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    // 'loading' can occur more than once for the same url/tab
    // so we use 'complete' which happens only once.
    if (changeInfo.status === 'complete') {
        if (tab.isInReaderMode) {
            readerModeTabs.set(tabId, cleanUrl(tab.url));
        } else {
            readerModeTabs.delete(tabId);
        }
    }

    if (changeInfo.isArticle &&
        !tab.isInReaderMode &&
        readerModeTabs.get(tabId) !== tab.url) {

        const url = cleanUrl(tab.url);

        if (containsUrl(readerSites, url) ||
            (openAllSitesInReader && !containsUrl(nonReaderSites, url))) {
            browser.tabs.toggleReaderMode(tabId);
        }
    }
});

// handle tab closing
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    readerModeTabs.delete(tabId);
});

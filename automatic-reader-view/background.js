/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Contributor: Paul Morris.

'use strict';

const STORAGE = browser.storage.local;

// readerModeTabs: Stores tab.id and clean url as key/value pairs for
// all tabs currently in reader view mode (the stored url does not begin
// with 'about:reader?url=' or 'http://' or 'https://').  This lets us handle
// two cases.
// 1. When a tab is in reader view and the user clicks to get out
// of it.  In that case we do not convert back to reader view.
// 2. If the tab is in reader view and the user loads another url that should
// be loaded in reader view.  This is why it is a mapping and not simply a set
// of tab ids, so two back-to-back auto-reader-view pages will work correctly.

function cleanUrl(url) {
    // remove 'about:reader?url=' from RV urls and unescape ':' '/' etc.
    // remove trailing '?...' and '#...'
    // remove 'http://' or 'https://'
    const trimUrl = url.startsWith('about:reader?url=') ? url.slice(17) : url,
        urlObj = new URL(unescape(trimUrl));

    return urlObj.hostname + urlObj.pathname;
}

function containsUrl(paths, url) {
    return paths.find((path) => url.startsWith(path));
}

async function handleTabUpdated(tabId, changeInfo, tab) {

    // 'loading' can occur more than once for the same url/tab
    // so we use 'complete' which happens only once.
    if (changeInfo.status === 'complete') {
        let storage = await STORAGE.get("readerModeTabs");
        if (tab.isInReaderMode) {
            storage.readerModeTabs[tabId] = cleanUrl(tab.url);
        } else {
            delete storage.readerModeTabs[tabId];
        }
        await STORAGE.set({
            "readerModeTabs": storage.readerModeTabs
        });
    }

    if (changeInfo.isArticle && !tab.isInReaderMode) {
        const url = cleanUrl(tab.url),
            storage = await STORAGE.get();

        // If the user exited reader view, do not re-enter reader view.
        if (storage.readerModeTabs[tabId] !== url) {

            if (containsUrl(storage.readerSitesPref, url) ||
                (storage.openAllSitesInReaderPref &&
                    !containsUrl(storage.nonReaderSitesPref, url))) {
                browser.tabs.toggleReaderMode(tabId);
            }
        }
    }
};

browser.tabs.onUpdated.addListener(handleTabUpdated);

// handle tab closing
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    readerModeTabs.delete(tabId);
});

async function handleInstalled(details) {
    // Initialize storage on initial install.
    if (details.reason === 'install') {
        let storage = await STORAGE.get(),
            defaults = {};

        if (storage.readerSitesPref === undefined) {
            defaults["readerSitesPref"] = [];
        }
        if (storage.nonReaderSitesPref === undefined) {
            defaults["nonReaderSitesPref"] = [];
        }
        if (storage.openAllSitesInReaderPref === undefined) {
            defaults["openAllSitesInReaderPref"] = false;
        }
        if (storage.readerModeTabs === undefined) {
            defaults["readerModeTabs"] = {};
        }
        STORAGE.set(defaults);
    }
};

browser.runtime.onInstalled.addListener(handleInstalled);

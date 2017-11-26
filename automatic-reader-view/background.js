/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Contributor: Paul Morris.

'use strict';

const STORAGE = browser.storage.local;

// Storage contains options (prefixed with 'o') and some state:
// {
//   oReaderUrls: [],
//   oNonReaderUrls: [],
//   oOpenAllInReader: false,
//   readerTabs: {}
// }
// readerTabs is a mapping of tab.id to a clean url for all tabs currently in
// reader view mode (the urls do not begin with 'about:reader?url=',
// 'http://', or 'https://').  This lets us handle two cases.
// 1. When a tab is in reader view and the user toggles out of it, we do not
// thwart their intention by converting back to reader view.
// 2. If the tab is in reader view and the user loads another url that should
// be loaded in reader view.  This is why we care about the urls and it is not
// simply a set of tab ids, so two back-to-back auto-reader-view pages will
// work correctly.

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
        let storage = await STORAGE.get("readerTabs");
        if (tab.isInReaderMode) {
            storage.readerTabs[tabId] = cleanUrl(tab.url);
        } else {
            delete storage.readerTabs[tabId];
        }
        await STORAGE.set({
            "readerTabs": storage.readerTabs
        });
    }

    if (changeInfo.isArticle && !tab.isInReaderMode) {
        const url = cleanUrl(tab.url),
            storage = await STORAGE.get();

        // If the user exited reader view, do not re-enter reader view.
        if (storage.readerTabs[tabId] !== url) {

            if (storage.oOpenAllInReader) {
                if (!containsUrl(storage.oNonReaderUrls, url)) {
                    browser.tabs.toggleReaderMode(tabId);
                }
            } else {
                if (containsUrl(storage.oReaderUrls, url)) {
                    browser.tabs.toggleReaderMode(tabId);
                }
            }
        }
    }
};

browser.tabs.onUpdated.addListener(handleTabUpdated);

// handle tab closing
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    readerTabs.delete(tabId);
});

async function handleUpdate(details) {
    // Migrate storage from version 0.2.1 (new names for options)
    if (details.previousVersion === "0.2.1") {
        let storage = await STORAGE.get();
        await STORAGE.clear();
        STORAGE.set({
            oReaderUrls: storage.readerSitesPref.map(cleanUrl),
            oNonReaderUrls: storage.nonReaderSitesPref.map(cleanUrl),
            oOpenAllInReader: storage.openAllSitesInReaderPref,
            readerTabs: {}
        });
    }
}

async function handleInstall(details) {
    let storage = await STORAGE.get(),
        defaults = {};

    if (storage.oReaderUrls === undefined) {
        defaults["oReaderUrls"] = [];
    }
    if (storage.oNonReaderUrls === undefined) {
        defaults["oNonReaderUrls"] = [];
    }
    if (storage.oOpenAllInReader === undefined) {
        defaults["oOpenAllInReader"] = false;
    }
    if (storage.readerTabs === undefined) {
        defaults["readerTabs"] = {};
    }
    STORAGE.set(defaults);
}

browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "update") {
        handleUpdate(details);
    } else if (details.reason === 'install') {
        handleInstall(details);
    }
});

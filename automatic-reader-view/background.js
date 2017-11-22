/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Contributor: Paul Morris.

'use strict';

const readerPrefix = 'about:reader?url=',
    suffix = '#automatic-reader-view';

// rvm: reader view map. Stores tab.id and url as key/value pairs for
// all tabs currently in reader view mode (the stored url is sanitized
// and does not begin with 'about:reader?url=').  This rvm lets us
// identify when a tab is in reader view and the user clicks to get out
// of it. In that case we do not convert back to reader view.
let rvm = new Map(),
    readerSites = [],
    openAllSitesInReader = false,
    nonReaderSites = [],

    checkForSite = (array, url) => {
        if (array.length > 0) {
            for (let site of array) {
                if (url.startsWith(site)) {
                    return true;
                }
            }
        }
        return false;
    };

// Ask the legacy part to dump the needed data and send it back to the
// background page where it can be saved using WebExtensions storage.
let port = browser.runtime.connect({name: 'legacy-addon-port'});

port.onMessage.addListener((msg) => {
    if (msg) {
        browser.storage.local.set(msg);
    }
    // set readerSites when readerSitesPref changes and on add-on initialization
    if (msg.readerSitesPref !== undefined) {
        readerSites = msg.readerSitesPref.length > 0 ? msg.readerSitesPref.split(', ') : [];
    }
    if (msg.openAllSitesInReaderPref !== undefined) {
        openAllSitesInReader = msg.openAllSitesInReaderPref;
    }
    if (msg.nonReaderSitesPref !== undefined) {
        nonReaderSites = msg.nonReaderSitesPref.length > 0 ? msg.nonReaderSitesPref.split(', ') : [];
    }
});

// handle tab closing
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    rvm.delete(tabId);
});

// handle tab loading
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.status === 'complete' ||
       (changeInfo.status === 'loading' && changeInfo.url)) {

        const url = changeInfo.url ? changeInfo.url : tab.url,
            isReaderUrl = url.startsWith(readerPrefix),

            // remove 'about:reader?url=' from RV urls and unescape ':' '/' etc.
            urlString = unescape(isReaderUrl ? url.slice(17) : url),
            urlObj = new URL(urlString),

            // remove trailing '?...' and '#...'
            cleanUrl = urlObj.origin + urlObj.pathname,
            isInRvm = rvm.get(tabId) === cleanUrl;

        // Because 'loading' can occur more than once for the same url/tab
        // we use 'complete' which happens only once.
        // If it's not a reader url, but is in rvm -- remove from rvm.
        if (changeInfo.status === 'complete') {
            if (!isReaderUrl && isInRvm) {
                rvm.delete(tabId);
            }

        } else if (changeInfo.status === 'loading' && changeInfo.url) {

            // 0. url that is not http: https: or about:reader -- return.
            // 1. non-reader-view site with 'open all sites in reader view' in effect -- return
            if ((urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:' && !isReaderUrl) ||
               (openAllSitesInReader && checkForSite(nonReaderSites, cleanUrl))) {
                return;
            }

            // 2. reader URL -- add to rvm if needed and return.
            if (isReaderUrl) {
                if (!isInRvm) {
                    rvm.set(tabId, cleanUrl);
                }
                return;
            } else {
                // 3. not a reader URL, but in rvm -- just return.
                if (isInRvm) {
                    return;
                }
            }

            // 4. not a reader URL, not in rvm -- is it in readerSites?

            // Either reload page in reader view or delete from rvm (in case
            // there is a tabId (key) entry but with a different url (value))
            if (openAllSitesInReader || checkForSite(readerSites, cleanUrl)) {

                // Because of differences between add-on sdk and webextensions
                // we can't just use a tab's id or index, so we add a
                // suffix to its url, then when this new url is being loaded
                // we send a message with that suffixed url, allowing the
                // tab to be identified by its url. (ugh.)  This madness
                // can go away when/if webextensions supports opening
                // about:reader urls.  We do it because webextensions tab
                // 'loading' event is sooner than add-on sdk's 'ready' event.

                if (url.endsWith(suffix)) {
                    // happens second
                    port.postMessage({ url: url });
                } else {
                    // happens first
                    browser.tabs.update(tabId, {url: url + suffix});
                }
            } else {
                rvm.delete(tabId);
            }
        }
    }
});

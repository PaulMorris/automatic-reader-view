/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const STORAGE = browser.storage.local;

// Takes a comma separated string of sites (from a pref) and returns
// a cleaned up string.  Trims whitespace, removes empty items, etc.
function cleanUpSiteList(siteList) {
    let items = siteList.split(','),
        newitems = new Set();

    for (let item of items) {
        item = item.trim();
        if (item.length !== 0) {
            if (item.startsWith("http://")) {
                item = item.slice(7);
            } else if (item.startsWith("https://")) {
                item = item.slice(8);
            }
            newitems.add(item);
        }
    }
    // Convert set to an array.
    return [...newitems];
};

function getAndUpdateSiteList(selector) {
    let element = document.querySelector(selector),
        sitesArray = cleanUpSiteList(element.value);

    element["value"] = sitesArray.join(", ") || "";
    return sitesArray;
};

function saveOptions(event) {
    event.preventDefault();
    let readerSitesPref = getAndUpdateSiteList("#readerSitesPref"),
        nonReaderSitesPref = getAndUpdateSiteList("#nonReaderSitesPref");
    STORAGE.set({
        readerSitesPref: readerSitesPref,
        nonReaderSitesPref: nonReaderSitesPref,
        openAllSitesInReaderPref: document.querySelector("#openAllSitesInReaderPref").checked || false
    });
};

document.querySelector("form").addEventListener("submit", saveOptions);

async function restoreOptions() {
    try {
        let background = browser.extension.getBackgroundPage(),
            options = await STORAGE.get(background.OPTIONS);
        if (options.readerSitesPref) {
            document.querySelector("#readerSitesPref")["value"] = options.readerSitesPref.join(', ') || "";
        }
        if (options.nonReaderSitesPref) {
            document.querySelector("#nonReaderSitesPref")["value"] = options.nonReaderSitesPref.join(', ') || "";
        }
        if (options.openAllSitesInReaderPref) {
            document.querySelector("#openAllSitesInReaderPref").checked = options.openAllSitesInReaderPref || false;
        }

    } catch (e) {
        console.error(e);
    }
};

document.addEventListener('DOMContentLoaded', restoreOptions);

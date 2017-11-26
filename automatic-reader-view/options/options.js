/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const STORAGE = browser.storage.local;
const OPTIONS = [
    "readerSitesPref",
    "nonReaderSitesPref",
    "openAllSitesInReaderPref"
];

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
        let fromStorage = await STORAGE.get(OPTIONS);
        if (fromStorage.readerSitesPref) {
            document.querySelector("#readerSitesPref")["value"] = fromStorage.readerSitesPref.join(', ') || "";
        }
        if (fromStorage.nonReaderSitesPref) {
            document.querySelector("#nonReaderSitesPref")["value"] = fromStorage.nonReaderSitesPref.join(', ') || "";
        }
        if (fromStorage.openAllSitesInReaderPref) {
            document.querySelector("#openAllSitesInReaderPref").checked = fromStorage.openAllSitesInReaderPref || false;
        }

    } catch (e) {
        console.error(e);
    }
};

document.addEventListener('DOMContentLoaded', restoreOptions);

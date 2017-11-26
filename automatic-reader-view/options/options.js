/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const STORAGE = browser.storage.local;
const OPTIONS = [
    "oReaderUrls",
    "oNonReaderUrls",
    "oOpenAllInReader"
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
    STORAGE.set({
        oReaderUrls: getAndUpdateSiteList("#oReaderUrls"),
        oNonReaderUrls: getAndUpdateSiteList("#oNonReaderUrls"),
        oOpenAllInReader: document.querySelector("#oOpenAllInReader").checked || false
    });
};

document.querySelector("form").addEventListener("change", saveOptions);

async function restoreOptions() {
    try {
        let options = await STORAGE.get(OPTIONS);
        document.querySelector("#oReaderUrls")["value"] = options.oReaderUrls.join(', ') || "";
        document.querySelector("#oNonReaderUrls")["value"] = options.oNonReaderUrls.join(', ') || "";
        document.querySelector("#oOpenAllInReader").checked = options.oOpenAllInReader || false;

    } catch (e) {
        console.error(e);
    }
};

document.addEventListener('DOMContentLoaded', restoreOptions);

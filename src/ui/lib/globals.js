/*
 * Consul - Control Surface Library
 * Copyright (C) 2022 Luciano Iam <oss@lucianoiam.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const PRODUCT_VERSION = '0.2.2';
const DEFAULT_LAYOUT = 'mixer';
const MIDI_CHANNEL = 1;

const env = DISTRHO.env;
const uiHelper = DISTRHO.UIHelper;
const el = document.getElementById.bind(document);


function isMobileDevice() {
    const ua = navigator.userAgent;
    return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
}

async function loadHtml(url) {
    const html = await (await fetch(url)).text();
    return document.createRange().createContextualFragment(html).firstChild;
}

function loadStylesheet(url) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = url;
        link.onload = _ => resolve(link);
        link.onerror = reject;
        document.head.appendChild(link);
    });
}

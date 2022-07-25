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

//
// Constants
//

const PRODUCT_VERSION = '0.2.2';
const DEFAULT_LAYOUT = 'mixer';
const MIDI_CHANNEL = 1;

const CONTROL_DESCRIPTOR = Object.freeze([
    { name: 'Knob'  , idPrefix: 'k', continuous: true , defaultBaseCC: 0    },
    { name: 'Button', idPrefix: 'b', continuous: false, defaultBaseCC: 0x10 },
    { name: 'Fader' , idPrefix: 'f', continuous: true , defaultBaseCC: 0x20 }
]);


//
// Load and start UI
//

loadScript('lib/ui.js').then(_ => ConsulUI.init());


//
// Helper functions
//

function elem(id) {
    return document.getElementById(id);
}

function isMobileDevice() {
    const ua = navigator.userAgent;
    return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script'); 
        script.src = url;
        script.onerror = reject;
        script.onload = resolve;
        document.body.appendChild(script);
    });
}

function loadStylesheet(url) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = url;
        link.onerror = reject;
        link.onload = _ => resolve(link);
        document.head.appendChild(link);
    });
}

async function loadHtml(url, allChildren) {
    const html = await (await fetch(url)).text();
    const frag = document.createRange().createContextualFragment(html);
    return allChildren ? frag.children : frag.firstChild;
}

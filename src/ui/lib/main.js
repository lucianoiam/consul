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

async function main() {
    await load('dpf.js');
    await load('lib/ui.js');

    ConsulUI.init(Object.freeze({
        productVersion    : '1.0.3',
        defaultLayout     : 'mixer',
        controlDescriptor : [
            { name: 'Button', id: 'b', n: 16, cont: false, def: { base: 0   , ch: 1 } },
            { name: 'Knob'  , id: 'k', n: 16, cont: true , def: { base: 0   , ch: 1 } },
            { name: 'Fader' , id: 'f', n: 8 , cont: true , def: { base: 0x10, ch: 1 } }
        ]
    }));
}

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

async function loadHtml(url) {
    const html = await (await fetch(url)).text();
    const frag = document.createRange().createContextualFragment(html);
    return frag.children.length == 1 ? frag.firstChild : frag.children;
}

async function load(...urls) {
    function promise(url) {
        switch (url.split('.').pop()) {
            case 'js':
                return loadScript(url);
            case 'css':
                return loadStylesheet(url);
            case 'html':
                return loadHtml(url);
            default:
                throw new TypeError('Unrecognized script or resource type');
        }
    }

    if (urls.length == 1) {
        return await promise(urls[0]);
    } else {
        return await Promise.all(urls.map((url) => promise(url)));
    }
}

main();

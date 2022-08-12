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

export function el(id) {
    return document.getElementById(id);
}

export function isMobileDevice() {
    const ua = navigator.userAgent;
    return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
}

export async function loadHtml(url) {
    const html = await (await fetch(url)).text(),
          frag = document.createRange().createContextualFragment(html);
    return frag.children.length == 1 ? frag.firstChild : frag.children;
}

export function loadStylesheet(url) {
    return new Promise((resolve, reject) => {
        const el = document.createElement('link');
        el.rel = 'stylesheet';
        el.type = 'text/css';
        el.href = url;
        el.onerror = reject;
        el.onload = _ => resolve(el);
        document.head.appendChild(el);
    });
}

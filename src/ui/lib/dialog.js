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
 
import '/dpf.js';
import * as U from './util.js';

class Dialog {

    static async _init() {
        const res = await Promise.all([
            U.loadHtml('dialog.html'),
            U.loadStylesheet('style/dialog.css')
        ]);

        // Clone nodes to avoid random errors apparently
        // caused by the inclusion of custom HTML elements
        for (const child of res[0]) {
            U.el('main').appendChild(child.cloneNode(true));
        }
    }
    
    static getTemplate(id) {
        return U.el('dialog-templates').content.getElementById(`dialog-${id}`).cloneNode(true);
    }

    constructor(el, opt) {
        this.el = el;
        this.opt = opt || {};

        if (typeof this.opt.ok == 'undefined') {
            this.opt.ok = true;
        }

        this._listeners = [];
    }

    show() {
        U.el('dialog-content').appendChild(this.el);

        const t = 0.2;

        const root = U.el('dialog-root');
        root.style.animationName = 'fadeIn';
        root.style.animationDuration = t + 's';

        const box = U.el('dialog-box');
        box.style.animationName = 'dialogBoxIn';
        box.style.animationDuration = t + 's';

        const ok = U.el('dialog-ok'); 
        ok.style.display = this.opt.ok ? 'inline' : 'none';

        const cancel = U.el('dialog-cancel')
        cancel.style.display = this.opt.cancel ? 'inline' : 'none';

        ['touchstart', 'mousedown'].forEach((evName) => {
            this.addEventListener(root, evName, (ev) => {
                if (ev.target == root) {
                    this.hide(false);
                }
            });
        });

        this.addEventListener(root, 'keydown', ev => {
            if ((ev.key == 'Enter') || (ev.key == 'Escape')) {
                this.hide(false);
            }
        });

        this.addEventListener(ok, 'input', ev => {
            if (! ev.target.value) {
                this.hide(true);
            }
        });

        this.addEventListener(cancel, 'input', ev => {
            if (! ev.target.value) {
                this.hide(false);
            }
        });

        if (this.opt.keyboard) {
            this._ui.setKeyboardFocus(true);
        }

        setTimeout(() => {
            const lastVisibleButton = Array.from(U.el('dialog-buttons').children)
                .filter(el => el.style.display != 'none')
                .pop();

            lastVisibleButton.focus()

            this.onShow();
        }, 1000 * t);
    }

    hide(ok) {
        const t = 0.1;

        if (this.opt.keyboard) {
            this._ui.setKeyboardFocus(false);
        }

        for (let o of this._listeners) {
            o.target.removeEventListener(o.type, o.listener);
        }
 
        const root = U.el('dialog-root')
        root.style.animationName = 'fadeOut';
        root.style.animationDuration = t + 's';

        const box = U.el('dialog-box');
        box.style.animationName = 'dialogBoxOut';
        box.style.animationDuration = t + 's';

        setTimeout(() => {
            this.el.parentNode.removeChild(this.el);
            this.onHide(ok);
        }, 1000 * t);
    }

    addEventListener(target, type, listener) {
        this._listeners.push({ target: target, type: type, listener: listener });
        target.addEventListener(type, listener);
    }

    onShow() {}
    onHide(ok) {}

    get _ui() {
        return DISTRHO.UI.sharedInstance;
    }

    get _uiHelper() {
        return DISTRHO.UIHelper;
    }

}

await Dialog._init();


export class AboutDialog extends Dialog {

    constructor(version) {
        super(Dialog.getTemplate('about')); 

        this.el.querySelector('#dialog-about-version').innerText = 'v' + version;
        this._uiHelper.bindSystemBrowser(this._ui, this.el.querySelector('#homepage'));
    }

}


export class NetworkDialog extends Dialog {

    // There are no async constructors in JavaScript...
    constructor() {
        super(/*el*/null, { keyboard: true });
    }

    // ...so do not show immediately and wait for element to load
    show() {
        this._uiHelper.getNetworkDetailsElement(this._ui, { gap: 30 }).then(el => {
            this.el = el;
            super.show();
        });
    }

}


export class MidiDialog extends Dialog {

    constructor(controlDescriptor, map, callback) {
        super(Dialog.getTemplate('midi'), { ok: true, cancel: true });

        this._map = map;
        this._callback = callback;

        const mapElem = this.el.querySelector('#dialog-midi-map'),
              entryTmpl = this.el.querySelector('template').content.firstElementChild,
              indexTmpl = entryTmpl.querySelector('.midi-map-index'),
              channelTmpl = entryTmpl.querySelector('.midi-map-channel');

        for (let i = 0; i < 128; i++) {
            const option = document.createElement('option');
            option.setAttribute('value', i.toString());
            option.innerText = '# ' + i;
            indexTmpl.appendChild(option); 
        }

        for (let i = 0; i < 16; i++) {
            const option = document.createElement('option');
            option.setAttribute('value', i.toString());
            option.innerText = 'Ch ' + (i + 1);
            channelTmpl.appendChild(option);
        }

        for (let desc of controlDescriptor) {
            for (let i = 0; i < desc.n; i++) {
                const entry = entryTmpl.cloneNode(true),
                      id = desc.id + '-' + (i + 1).toString().padStart(2, '0'),
                      map = this._map[id];
                
                entry.setAttribute('data-id', id);
                entry.querySelector('.midi-map-target').innerText = `${desc.name} ${i + 1}`;

                const status = entry.querySelector('.midi-map-status');
                status.value = (map[0] ^ 0x90) == 0 ? 'note' : 'cc';

                if (desc.cont) {
                    status.setAttribute('disabled', true);
                    status.style.border = 'none';
                }

                entry.querySelector('.midi-map-index').value = map[2].toString();
                entry.querySelector('.midi-map-channel').value = (map[0] & 0x0f).toString();

                mapElem.appendChild(entry);
            }
        }
    }

    onHide(ok) {
        if (! ok) {
            return;
        }

        const mapElem = this.el.querySelector('#dialog-midi-map').children;

        for (let entry of mapElem) {
            const id = entry.getAttribute('data-id');

            if (!id) {
                continue; // skip template
            }

            const statusType = entry.querySelector('.midi-map-status').value,
                  channel = parseInt(entry.querySelector('.midi-map-channel').value),
                  statusOn = (statusType == 'cc' ? 0xb0 : 0x90) | channel,
                  statusOff = statusType == 'cc' ? null : 0x80 | channel,
                  index = parseInt(entry.querySelector('.midi-map-index').value);

            this._map[id] = [statusOn, statusOff, index];
        }

        this._callback(this._map);
    }

}


export class LayoutDialog extends Dialog {

    constructor(selectedLayoutId, callback) {
        super(Dialog.getTemplate('layout'), { ok: false, cancel: true });

        this._callback = callback;
        this._prevLayoutId = selectedLayoutId;
        this._nextLayoutId = null;

        const toggle = (li) => {
            if (li.style.color) {
                li.style.color = '';
                li.style.backgroundColor = '';
            } else {
                li.style.color = '#000';
                li.style.backgroundColor = '#fff';
            }
        };

        const animate = (li, callback) => {
            let n = 3;

            const step = li => {
                toggle(li);

                if (--n == 0) {
                    callback();
                } else {
                    setTimeout(_ => step(li), 75);
                }
            };

            step(li);
        };

        const layoutList = this.el.querySelector('#dialog-layout-list');

        const focus = layoutList.querySelector(`[data-id=${this._prevLayoutId}]`);
        toggle(focus);

        for (let li of layoutList.children) {
            ['touchstart', 'mousedown'].forEach((evName) => {
                this.addEventListener(li, evName, (ev) => {
                    toggle(focus);
                    toggle(li);

                    if (ev.cancelable) {
                        ev.preventDefault();
                    }
                });
            });

            ['touchend', 'mouseup'].forEach((evName) => {
                this.addEventListener(li, evName, (ev) => {
                    animate(li, _ => {
                        this._nextLayoutId = li.getAttribute('data-id');
                        this.hide(true);
                    });

                    if (ev.cancelable) {
                        ev.preventDefault();
                    }
                });
            });
        }
    }

    onHide(ok) {
        if (ok && (this._nextLayoutId != this._prevLayoutId)) {
            this._callback(this._nextLayoutId);
        }
    }

}

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

class ModalDialog {

    static async init() {
        await Promise.all([
            loadStylesheet('style/modal.css'),
            loadHtml('modal.html', true).then(children => {
                for (const child of children) {
                    // Clone nodes to avoid random errors possibly caused by the
                    // usage of custom HTML elements.
                    elem('main').appendChild(child.cloneNode(true));
                };
            })
        ]);
    }
    
    static getTemplate(id) {
        return elem('modal-templates').content.getElementById(`modal-${id}`).cloneNode(true);
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
        elem('modal-content').appendChild(this.el);

        const t = 0.2;

        const root = elem('modal-root');
        root.style.animationName = 'fadeIn';
        root.style.animationDuration = t + 's';

        const box = elem('modal-box');
        box.style.animationName = 'modalBoxIn';
        box.style.animationDuration = t + 's';

        const ok = elem('modal-ok'); 
        ok.style.display = this.opt.ok ? 'inline' : 'none';

        const cancel = elem('modal-cancel')
        cancel.style.display = this.opt.cancel ? 'inline' : 'none';

        this.addEventListener(root, 'click', ev => {
            if (ev.target == root) {
                this.hide(false);
            }            
        });

        this.addEventListener(root, 'keydown', ev => {
            if ((ev.key == 'Enter') || (ev.key == 'Escape')) {
                this.hide(false);
            }
        });

        this.addEventListener(ok, 'input', ev => {
            if (! ev.target.value) { // up
                this.hide(true);
            }
        });

        this.addEventListener(cancel, 'input', ev => {
            if (! ev.target.value) { // up
                this.hide(false);
            }
        });

        this._ui.setKeyboardFocus(true);

        setTimeout(() => {
            const lastVisibleButton = Array.from(elem('modal-buttons').children)
                .filter(el => el.style.display != 'none')
                .pop();

            lastVisibleButton.focus()

            this.onShow();
        }, 1000 * t);
    }

    hide(ok) {
        this._ui.setKeyboardFocus(false);

        for (let o of this._listeners) {
            o.target.removeEventListener(o.type, o.listener);
        }

        const t = 0.1;
        const root = elem('modal-root')
        root.style.animationName = 'fadeOut';
        root.style.animationDuration = t + 's';

        const box = elem('modal-box');
        box.style.animationName = 'modalBoxOut';
        box.style.animationDuration = t + 's';

        setTimeout(() => {
            elem('modal-content').innerHTML = '';
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

}


class AboutModalDialog extends ModalDialog {

    constructor() {
        super(ModalDialog.getTemplate('about')); 

        this.el.querySelector('#modal-about-version').innerText = 'v' + PRODUCT_VERSION;
        uiHelper.bindSystemBrowser(this._ui, this.el.querySelector('#homepage'));
    }

}


class NetworkModalDialog extends ModalDialog {

    // There are no async constructors in JavaScript

    show() {
        uiHelper.getNetworkDetailsElement(this._ui, { gap: 30 }).then(el => {
            this.el = el;
            super.show();
        });
    }

}


class MidiModalDialog extends ModalDialog {

    constructor() {
        super(ModalDialog.getTemplate('midi'));
    }

}


class LayoutModalDialog extends ModalDialog {

    constructor(selectedLayoutId, callback) {
        super(ModalDialog.getTemplate('layout'), { ok: false, cancel: true });

        this._callback = callback;
        this._prevLayoutId = selectedLayoutId;
        this._nextLayoutId = null;

        const select = li => {
            li.style.color = '#000';
            li.style.backgroundColor = '#fff';
        };

        const deselect = li => {
            li.style.color = '';
            li.style.backgroundColor = '';
        };

        const layoutList = this.el.querySelector('#modal-layout-list');

        const focus = layoutList.querySelector(`[data-id=${this._prevLayoutId}]`);
        select(focus);

        for (let li of layoutList.children) {
            li.addEventListener('mousedown', ev => {
                deselect(focus);
                select(li);
            });

            li.addEventListener('mouseup', ev => {
                setTimeout(_ => {
                    this._nextLayoutId = li.getAttribute('data-id');
                    this.hide(true);
                }, 150);
            });
        }
    }

    onHide(ok) {
        if (ok && (this._nextLayoutId != this._prevLayoutId)) {
            this._callback(this._nextLayoutId);
        }
    }

}

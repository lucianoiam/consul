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

const DEFAULT_LAYOUT = 'mixer';
const MIDI_CHANNEL = 1;

const env = DISTRHO.env,
      helper = DISTRHO.UIHelper,
      el = document.getElementById.bind(document);

class ConsulUI extends DISTRHO.UI {

    //
    // DPF UI interface (+ hiphop extensions)
    // 

    constructor() {
        super();

        this._config = {};
        this._uiState = {};
        this._shouldShowStatus = false;
        this._activeLayoutId = null;
        this._showStatusTimer = null;
        this._hideStatusTimer = null;

        this._initView();
        this._initController();
    }

    stateChanged(key, value) {
        switch (key) {
            case 'config':
                if (value) {
                    this._config = JSON.parse(value);
                    this._config.init = true;
                }
                break;
            case 'ui':
                if (value) {
                    this._uiState = JSON.parse(value);
                    this._uiState.init = true;
                }
                break;
        }

        // Will be called every time config is updated by any client
        if (this._config.init && this._uiState.init) {
            this._loadLayout(this._config['layout'] || DEFAULT_LAYOUT);
        }
    }

    messageReceived(args) {
        if ((args[0] == 'control') && (args.length == 3)) {
            el(args[1]).value = args[2];
        }
    }


    //
    // View
    //

    _initView() {
        if (this._isMobile) {
            window.addEventListener('resize', _ => this._zoomUi());
        } else if (! env.plugin) {
            el('main').style.borderRadius = '10px'; // desktop browser
        }

        if (env.dev) {
            this._loadLayout(DEFAULT_LAYOUT);
        }
    }

    _zoomUi() {
        // Use mixer size as the base size for all layouts
        const baseWidth = 800;
        const baseHeight = 540;

        // Zoom interface to take up full window height
        const dv = window.innerHeight - baseHeight; // can be negative
        const scale = 1.0 + dv / baseHeight;
        const main = el('main');
        main.style.width = window.innerWidth / scale + 'px';
        main.style.height = baseHeight + 'px';
        main.style.transform = `scale(${100 * scale}%)`;

        // Remove minimum size restrictions
        document.body.style.minWidth = 'auto';
        document.body.style.minHeight = 'auto';
    }

    _showStatus(message) {
        const apply = () => {
            this._showStatusTimer = null;

            const status = el('status');
            status.textContent = message;
            status.style.transition = 'none';
            status.style.opacity = '1';

            if (this._hideStatusTimer) {
                clearTimeout(this._hideStatusTimer);
            }

            this._hideStatusTimer = setTimeout(() => {
                this._hideStatusTimer = null;

                status.style.transition = 'opacity 150ms';
                status.style.opacity = '0';
            }, 1500);
        };

        // For some reason setting status.textContent takes abnormally long
        // on Linux WebKitGTK. Issue not reproducible on Firefox or Chromium
        // running on the same hardware/OS combination.
        if (env.fakeViewport) {
            if (this._showStatusTimer) {
                clearTimeout(this._showStatusTimer);
            }

            this._showStatusTimer = setTimeout(() => { apply() }, 20);

            return;
        }

        apply();
    }


    //
    // Controller
    //

    _initController() {
        helper.enableOfflineModal(this);

        el('option-about').addEventListener('input', ev => {
            if (! ev.target.value) { // up
                this._showAboutModal();
            }
        });

        const invertSvg = (el, val) => {
            el.shadowRoot.querySelectorAll('path').forEach(p => p.style.fill = val ? '#000' : '#fff');
        };

        el('option-layout').addEventListener('input', ev => {
            if (ev.target.value) {
                invertSvg(ev.target, true);
            } else {
                invertSvg(ev.target, false);
                this._showLayoutModal();
            }
        });
              
        el('option-midi').addEventListener('input', ev => {
            if (ev.target.value) {
                invertSvg(ev.target, true);
            } else {
                invertSvg(ev.target, false);
                this._showMidiModal();
            }
        });

        el('option-network').addEventListener('input', ev => {
            if (ev.target.value) {
                invertSvg(ev.target, true);
            } else {
                invertSvg(ev.target, false);
                this._showNetworkModal();
            }
        });

        el('modal-cancel').addEventListener('input', ev => {
            if (! ev.target.value) {
                this._hideModal(false);
            }
        });

        el('modal-ok').addEventListener('input', ev => {
            if (! ev.target.value) {
                this._hideModal(true);
            }
        });

        const modalRoot = el('modal-root');
        modalRoot.addEventListener('click', ev => {
            if (ev.target == modalRoot) {
                this._hideModal(false);
            }            
        });
        modalRoot.addEventListener('keydown', ev => {
            if ((ev.key == 'Enter') || (ev.key == 'Escape')) {
                this._hideModal(false);
            }
        });
    }

    _handleControlInput(el) {
        this._uiState[el.id] = el.value;

        const descriptor = this.constructor.CONTROL_DESCRIPTOR[el.nodeName.toLowerCase()];
        const status = 0xb0 | (MIDI_CHANNEL - 1);
        const ccIndex = descriptor.ccBase + parseInt(el.id.split('-')[1]) - 1;
        const ccValue = descriptor.midiVal(el.value);
        this.postMessage('control', el.id, el.value, status, ccIndex, ccValue);

        if (this._shouldShowStatus) {
            const name = el.getAttribute('data-name').padEnd(10, ' ');
            const value = descriptor.strVal(el.value).padStart(4, ' ');
            this._showStatus(`${name}${value}`);
        }
    }


    //
    // Layouts
    //

    async _loadLayout(id) {
        if (this._activeLayoutId == id) {
            return;
        }

        document.body.style.visibility = 'hidden';

        // Load stylesheet. It is necessary to remove the previous one because
        // layout stylesheets define size properties for body and #main .
        await new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.id = `style-${id}`;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = `/layouts/${id}.css`;
            link.addEventListener('load', resolve);

            if (this._activeLayoutId != null) {
                const prevStyle = el(`style-${this._activeLayoutId}`);
                document.head.removeChild(prevStyle);
            }

            document.head.appendChild(link);
        });

        // Load and replace current layout HTML
        const html = await (await fetch(`/layouts/${id}.html`)).text();
        const layout = document.createRange().createContextualFragment(html).firstChild;
        el('layout').replaceChildren(layout);

        this._shouldShowStatus = layout.getAttribute('data-show-status') == 'true';
        this._activeLayoutId = id;

        // Connect controls
        layout.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', _ => this._handleControlInput(el));
        });

        // Restore state
        for (const controlId in this._uiState) {
            const control = el(controlId);
            if (control) {
                el(controlId).value = this._uiState[controlId];
            }
        }

        // Plugin embedded view size
        if (env.plugin) {
            const size = this._getActiveLayoutCSSSize();
            const k = window.devicePixelRatio;
            this.setSize(k * size.width, k * size.height);
        }

        // Zoom view for mobile
        if (this._isMobile) {
            this._zoomUi(); // relative to startup size (CSS #main)
        }

        document.body.style.visibility = 'visible';
    }


    //
    // Modal dialogs
    //

    _showAboutModal() {
        const modal = this._getModal('about');
        helper.bindSystemBrowser(this, modal.querySelector('#homepage'));
        this._showModal(modal, true, false);
    }

    _showLayoutModal() {
        this._showModal(this._getModal('layout'), false, true);

        for (let li of el('modal-layout-list').children) {
            li.addEventListener('mousedown', ev => {
                li.style.color = '#000';
                li.style.backgroundColor = '#fff';
            });

            li.addEventListener('mouseup', ev => {
                setTimeout(_ => {
                    this._hideModal(true, _ => {
                        const layoutId = li.getAttribute('data-id');
                        this._loadLayout(layoutId);
                        this._setConfigOption('layout', layoutId);
                    });
                }, 150);
            });
        }
    }

    _showMidiModal() {
        this._showModal(this._getModal('midi'), true, false);
    }

    async _showNetworkModal() {
        this._showModal(await helper.getNetworkDetailsElement(this), true, false);
    }

    _getModal(id) {
        return el('modal-templates').content.getElementById(`modal-${id}`).cloneNode(true);
    }

    _showModal(elem, ok, cancel) {
        const t = 0.2;
        el('modal-content').appendChild(elem);

        const root = el('modal-root');
        root.style.animationName = 'fadeIn';
        root.style.animationDuration = t + 's';
        
        const box = el('modal-box');
        box.style.animationName = 'modalBoxIn';
        box.style.animationDuration = t + 's';

        el('modal-ok').style.display = ok ? 'inline' : 'none';
        el('modal-cancel').style.display = cancel ? 'inline' : 'none';

        this.setKeyboardFocus(true);

        setTimeout(() => {
            const lastVisibleButton = Array.from(el('modal-buttons').children)
                .filter(el => el.style.display != 'none')
                .pop();
            lastVisibleButton.focus()
        }, 1000 * t);
    }

    _hideModal(accept, callback) {
        const t = 0.1;

        const root = el('modal-root')
        root.style.animationName = 'fadeOut';
        root.style.animationDuration = t + 's';

        const box = el('modal-box');
        box.style.animationName = 'modalBoxOut';
        box.style.animationDuration = t + 's';

        this.setKeyboardFocus(false);

        setTimeout(() => {
            el('modal-content').innerHTML = '';

            if (callback) {
                callback();
            }
        }, 1000 * t);
    }
    

    //
    // Helper methods
    //

    get _isMobile() {
        const ua = navigator.userAgent;
        return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
    }

    _getActiveLayoutCSSSize() {
        // Find matching CSSStyleSheet object
        const style = Array.from(document.styleSheets).find(css => {
            return css.href && css.href.split('/').pop().split('.').shift() == this._activeLayoutId;
        });

        // Read #main px values
        const rule = Array.from(style.cssRules).find(r => {
            return r.selectorText == '#main';
        });

        return {
            width  : parseInt(rule.style.getPropertyValue('width')),
            height : parseInt(rule.style.getPropertyValue('height'))
        };
    }

    _setConfigOption(key, value) {
        this._config[key] = value;
        this.setState('config', JSON.stringify(this._config));
    }

}

(() => {
    // Static init

    const contMidiVal = v => Math.floor(127 * v);
    const contStrVal  = v => Math.round(100 * v) + '%';
    const boolMidiVal = v => v ? 127 : 0;
    const boolStrVal  = v => v ? 'ON' : 'OFF';

    ConsulUI.CONTROL_DESCRIPTOR = Object.freeze({
        'g-knob'   : { ccBase: 0   , midiVal: contMidiVal, strVal: contStrVal },
        'g-button' : { ccBase: 0x10, midiVal: boolMidiVal, strVal: boolStrVal },
        'g-fader'  : { ccBase: 0x20, midiVal: contMidiVal, strVal: contStrVal }
    });

}) ();

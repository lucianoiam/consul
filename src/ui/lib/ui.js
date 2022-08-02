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
import './guinda.js';
import { elem, isMobileDevice, loadHtml, loadStylesheet } from './main.js';
import { AboutDialog, NetworkDialog, MidiDialog, LayoutDialog } from './modal.js';

export default class ConsulUI extends DISTRHO.UI {

    static async _init() {
        await loadStylesheet('style/ui.css');
        document.querySelectorAll('g-button').forEach(el => el.reset()); // reload colors
    }

    constructor(opt) {
        super();

        this._opt = Object.freeze(opt);
        this._config = {};
        this._uiState = {};
        this._shouldShowStatus = false;
        this._activeLayoutId = null;
        this._showStatusTimer = null;
        this._hideStatusTimer = null;

        this._initMenuBarController();

        if (! this._env.plugin) {
            this._initNonPlugin();
        }
    }

    stateChanged(key, value) {
        switch (key) {
            case 'config':
                if (value) {
                    this._config = JSON.parse(value);
                    
                    if (Object.keys(this._config).length == 0) {
                        this._config['map'] = this._buildDefaultMidiMap();
                        this._config['layout'] = this._opt.defaultLayout;
                        this._saveConfig();
                    }

                    this._applyConfig();
                }

                break;
            case 'ui':
                if (value) {
                    this._uiState = JSON.parse(value);
                    this._applyUiState();
                }

                break;
        }
    }

    messageReceived(args) {
        if ((args[0] == 'control') && (args.length == 3)) {
            const id = args[1];
            const value = args[2];
            this._uiState[id] = value;
            elem(id).value = value;
        }
    }

    get _env() {
        return DISTRHO.env;
    }

    _initMenuBarController() {
        const invertSvg = (el, val) => {
            const fill = val ? '#000' : '#fff';
            el.shadowRoot.querySelectorAll('path,polygon,circle').forEach(p => p.style.fill = fill);
        };

        const optionAbout = elem('option-about'),
              optionLayout = elem('option-layout'),
              optionMidi = elem('option-midi'),
              optionNetwork = elem('option-network');

        optionAbout.addEventListener('input', ev => {
            if (! ev.target.value) {
                new AboutDialog(this._opt.productVersion).show();
            }
        });

        optionLayout.addEventListener('input', ev => {
            if (ev.target.value) {
                invertSvg(ev.target, true);
            } else {
                invertSvg(ev.target, false);
                new LayoutDialog(this._activeLayoutId, newLayoutId => {
                    this._loadLayout(newLayoutId);
                    this._setConfigEntry('layout', newLayoutId);
                }).show();
            }
        });

        if (this._env.plugin) {
            optionMidi.addEventListener('input', ev => {
                if (ev.target.value) {
                    invertSvg(ev.target, true);
                } else {
                    invertSvg(ev.target, false);
                    new MidiDialog(this._opt.controlDescriptor, this._config['map'], newMap => {
                        this._setConfigEntry('map', newMap);
                    }).show();
                }
            });

            optionNetwork.addEventListener('input', ev => {
                if (ev.target.value) {
                    invertSvg(ev.target, true);
                } else {
                    invertSvg(ev.target, false);
                    new NetworkDialog().show();
                }
            });
        } else {
            optionMidi.style.display = 'none';
            optionNetwork.style.display = 'none';
        }
    }

    _initNonPlugin() {
        DISTRHO.UIHelper.enableOfflineModal(this);

        document.body.style.backgroundColor = '#1a1a1a';

        if (isMobileDevice()) {
            window.addEventListener('resize', _ => this._zoomUi());
        } else {
            elem('main').style.borderRadius = '10px'; // desktop browser
        }

        if (this._env.dev) {
            this.stateChanged('config', '{}');
            this.stateChanged('ui', '{}');
        }
    }

    _showStatus(message, numericValue, delay) {
        const apply = () => {
            this._showStatusTimer = null;

            elem('status-text').textContent = message;

            const valueBox = elem('status-value-box');

            if (typeof numericValue == 'undefined') {
                valueBox.style.display = 'none';
            } else {
                valueBox.style.display = 'inline';
                elem('status-value').style.width = `${100 * numericValue}%`;
            }

            const status = elem('status');
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

        if (delay) {
            if (this._showStatusTimer) {
                clearTimeout(this._showStatusTimer);
            }

            this._showStatusTimer = setTimeout(() => { apply() }, delay);
        } else {
            apply();
        }
    }

    _zoomUi() {
        // Use mixer size as the base size for all layouts
        const baseWidth = 800;
        const baseHeight = 540;
        const main = elem('main');
        const dv = window.innerHeight - baseHeight;

        if (dv > 0) {
            // Zoom interface to take up full window height
            const scale = 1.0 + dv / baseHeight;
            main.style.width = window.innerWidth / scale + 'px';
            main.style.height = baseHeight + 'px';
            main.style.transform = `scale(${100 * scale}%)`;
            document.body.style.overflow = 'hidden';
        } else {
            // Viewport too small, ie. phone in portrait orientation. Since
            // the UI elements have fixed size some of them could appear cropped.
            main.style.width = '';
            main.style.height = '';
            main.style.transform = '';
            document.body.style.overflow = 'scroll';
        }
    }

    async _loadLayout(id) {
        if (this._activeLayoutId == id) {
            return;
        }

        document.body.style.visibility = 'hidden';

        // Load layout stylesheet. It is necessary to remove the previous one
        // because layout stylesheets define size properties for body and #main.
        const style = await loadStylesheet(`/layouts/${id}.css`);
        style.id = `style-${id}`;

        if (this._activeLayoutId != null) {
            document.head.removeChild(elem(`style-${this._activeLayoutId}`));
        }

        // Load and replace current layout HTML
        const layout = await loadHtml(`/layouts/${id}.html`);
        elem('layout').replaceChildren(layout);

        this._shouldShowStatus = layout.getAttribute('data-show-status') == 'true';
        this._activeLayoutId = id;

        // Connect controls
        layout.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', _ => this._handleControlInput(el));
        });

        // Plugin embedded view size
        if (this._env.plugin) {
            const size = this._getActiveLayoutCSSSize();
            const k = window.devicePixelRatio;
            this.setSize(k * size.width, k * size.height);
        }

        // Zoom view for mobile
        if (isMobileDevice()) {
            this._zoomUi(); // relative to startup size (CSS #main)
        }

        this._applyUiState();

        document.body.style.visibility = 'visible';
    }

    _getActiveLayoutCSSSize() {
        // Find matching CSSStyleSheet object
        const style = Array.from(document.styleSheets).find(css => {
            return css.href && css.href.split('/').pop().split('.').shift() == this._activeLayoutId;
        });

        // Read #main px values
        const rule = Array.from(style.cssRules).find(r => { return r.selectorText == '#main' });

        return {
            width  : parseInt(rule.style.getPropertyValue('width')),
            height : parseInt(rule.style.getPropertyValue('height'))
        };
    }

    _buildDefaultMidiMap() {
        let map = {};

        for (let desc of this._opt.controlDescriptor) {
            const statusOn = (desc.cont ? /*cc*/0xb0 : /*note on*/0x90) | (desc.def.ch - 1);
            const statusOff = desc.cont ? null : (/*note off*/0x80 | (desc.def.ch - 1));

            for (let i = 0; i < desc.n; i++) {
                const id = desc.id + '-' + (i + 1).toString().padStart(2, '0');
                map[id] = [statusOn, statusOff, /*index*/desc.def.base + i];
            }
        }

        return map;
    }

    _handleControlInput(el) {
        this._uiState[el.id] = el.value;

        const map     = this._config['map'][el.id];
        const desc    = this._opt.controlDescriptor.find(cd => cd.id == el.id[0]);
        const midiVal = desc.cont ? v => Math.floor(127 * v)       : v => v ? 127 : 0;
        const strVal  = desc.cont ? v => Math.round(100 * v) + '%' : v => v ? 'ON' : 'OFF';
        const status  = (map[0] ^ 0xb0) == 0 /*cc*/? map[0] : (el.value ? /*on*/map[0] : /*off*/map[1]);

        this.postMessage('control', el.id, el.value, status, /*index*/map[2], midiVal(el.value));

        if (this._shouldShowStatus) {
            const message = el.getAttribute('data-name').padEnd(10, ' ')
                            + strVal(el.value).padStart(4, ' ');
            const numericValue = desc.cont ? el.value : undefined;

            // For some reason modifying the DOM here takes abnormally long on
            // Linux WebKitGTK especially when doing so in response to a touch
            // input event (probably touch events resolution > mouse events
            // resolution). Issue not reproducible on Firefox or Chromium
            // running on the same hardware and OS combination.
            const delay = this._env.fakeViewport ? 20 : 0;

            this._showStatus(message, numericValue, delay);
        }
    }

    _applyUiState() {
        for (const controlId in this._uiState) {
            const control = elem(controlId);
            if (control) {
                elem(controlId).value = this._uiState[controlId];
            }
        }
    }

    _applyConfig() {
        this._loadLayout(this._config['layout']);
    }

    _saveConfig() {
        this.setState('config', JSON.stringify(this._config));
    }

    _setConfigEntry(key, value) {
        this._config[key] = value;
        this._saveConfig();
    }

}

await ConsulUI._init();

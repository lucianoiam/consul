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

class ConsulUI extends DISTRHO.UI {

    static async init() {
        await Promise.all([
            loadScript('lib/guinda.js'),
            loadScript('lib/modal.js')
        ]);

        await ModalDialog.init();

        DISTRHO.UI.sharedInstance = new ConsulUI;
    }

    constructor() {
        super();

        this._config = {};
        this._uiState = {};
        this._shouldShowStatus = false;
        this._activeLayoutId = null;
        this._showStatusTimer = null;
        this._hideStatusTimer = null;

        this._initMenuBar();

        if (isMobileDevice()) {
            window.addEventListener('resize', _ => this._zoomUi());
        } else if (! this._env.plugin) {
            elem('main').style.borderRadius = '10px'; // desktop browser
        }

        if (this._env.dev) {
            this._loadLayout(DEFAULT_LAYOUT);
        }

        DISTRHO.UIHelper.enableOfflineModal(this);
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
            elem(args[1]).value = args[2];
        }
    }

    _initMenuBar() {
        const invertSvg = (el, val) => {
            const fill = val ? '#000' : '#fff';
            el.shadowRoot.querySelectorAll('path,polygon,circle').forEach(p => p.style.fill = fill);
        };

        elem('option-about').addEventListener('input', ev => {
            if (! ev.target.value) { // up
                new AboutModalDialog().show();
            }
        });

        elem('option-layout').addEventListener('input', ev => {
            if (ev.target.value) {
                invertSvg(ev.target, true);
            } else {
                invertSvg(ev.target, false);
                new LayoutModalDialog(this._activeLayoutId, newLayoutId => {
                    this._loadLayout(newLayoutId);
                    this._setConfigOption('layout', newLayoutId);
                }).show();
            }
        });
              
        const optionMidi = elem('option-midi');
        const optionNetwork = elem('option-network');

        if (this._env.plugin) {
            optionMidi.addEventListener('input', ev => {
                if (ev.target.value) {
                    invertSvg(ev.target, true);
                } else {
                    invertSvg(ev.target, false);
                    new MidiModalDialog().show();
                }
            });

            optionNetwork.addEventListener('input', ev => {
                if (ev.target.value) {
                    invertSvg(ev.target, true);
                } else {
                    invertSvg(ev.target, false);
                    new NetworkModalDialog().show();
                }
            });
        } else {
            optionMidi.style.display = 'none';
            optionNetwork.style.display = 'none';
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

    _showStatus(message, numericValue) {
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

        // For some reason setting status.textContent takes abnormally long
        // on Linux WebKitGTK. Issue not reproducible on Firefox or Chromium
        // running on the same hardware/OS combination.
        if (this._env.fakeViewport) {
            if (this._showStatusTimer) {
                clearTimeout(this._showStatusTimer);
            }

            this._showStatusTimer = setTimeout(() => { apply() }, 20);

            return;
        }

        apply();
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

        // Restore state
        for (const controlId in this._uiState) {
            const control = elem(controlId);
            if (control) {
                elem(controlId).value = this._uiState[controlId];
            }
        }

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

    _handleControlInput(el) {
        this._uiState[el.id] = el.value;

        const desc = CONTROL_DESCRIPTOR.find(cd => cd.idPrefix == el.id[0]);
        const midiVal = desc.continuous ? v => Math.floor(127 * v)       : v => v ? 127 : 0;
        const strVal  = desc.continuous ? v => Math.round(100 * v) + '%' : v => v ? 'ON' : 'OFF';

        const status = 0xb0 | (MIDI_CHANNEL - 1);
        const ccIndex = desc.defaultBaseCC + parseInt(el.id.split('-')[1]) - 1;
        const ccValue = midiVal(el.value);

        this.postMessage('control', el.id, el.value, status, ccIndex, ccValue);

        if (this._shouldShowStatus) {
            const name = el.getAttribute('data-name').padEnd(10, ' ');
            const value = strVal(el.value).padStart(4, ' ');

            this._showStatus(`${name}${value}`, desc.continuous ? el.value : undefined);
        }
    }

    _setConfigOption(key, value) {
        this._config[key] = value;
        this.setState('config', JSON.stringify(this._config));
    }

    get _env() {
        return DISTRHO.env;
    }

}

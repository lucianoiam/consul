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

const MIDI_CHANNEL = 1;

const CONTROL_DESCRIPTOR = Object.freeze({
    'g-knob'   : { ccBase: 0,    midiVal: v => Math.floor(127 * v) },
    'g-button' : { ccBase: 0x10, midiVal: v => v ? 127 : 0         },
    'g-fader'  : { ccBase: 0x20, midiVal: v => Math.floor(127 * v) }
});

const env = DISTRHO.env,
      helper = DISTRHO.UIHelper,
      el = document.getElementById.bind(document);

class ConsulUI extends DISTRHO.UI {

    constructor() {
        super();

        this._config = {};
        this._clearStatusTimer = null;
        
        this._initView();
        this._initController();
    }

    messageReceived(args) {
        if ((args[0] == 'control') && (args.length == 3)) {
            el(args[1]).value = args[2];
        }
    }

    stateChanged(key, value) {
        //console.log(`JS stateChanged() : ${key} = ${value}`);
        switch (key) {
            case 'config':
                if (value) {
                    this._config = JSON.parse(value);
                }
                break;
            case 'ui':
                if (value) {
                    const ui = JSON.parse(value);
                    for (const id in ui) {
                        el(id).value = ui[id];
                    }
                }
                this._showUi();
                break;
        }
    }

    _initView() {
        // CSS media query unusuable on Linux WebKitGTK
        if (env.noReliableScreenSize) {
            const className = 'force-landscape';
            document.body.classList.add(className);
            el('main').classList.add(className);
            el('mixer').classList.add(className);
            document.querySelectorAll('.landscape').forEach(el => {
                el.classList.add(className);
            });
        }

        if (this._isMobile) {
            const dv = window.innerHeight - main.clientHeight;
            const scale = 100 * (1 + dv / main.clientHeight);
            el('main').style.transform = `scale(${scale}%)`;
        }

        if (env.dev) {
            this._showUi();
        }
    }

    _initController() {
        helper.enableOfflineModal(this);

        if (env.plugin || env.dev) {
            el('network').addEventListener('input', ev => {
                if (! ev.target.value) {
                    helper.showQRCodeModal(this, {id: 'qr-modal'});
                }
            });
            
            el('midi').addEventListener('input', ev => {
                if (ev.target.value) {
                    this._showStatus('Not yet implemented');
                }
            });

            el('layout').addEventListener('input', ev => {
                if (ev.target.value) {
                    this._showStatus('Not yet implemented');
                }
            });
        } else {
            const network = el('network');
            network.parentNode.removeChild(network);
        }

        document.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', ev => this._handleControlInput(el));
        });
    }

    _showUi() {
        document.body.style.visibility = 'visible';
    }

    _showStatus(message) {
        const status = el('status');
        status.innerText = message;

        if (this._clearStatusTimer) {
            clearTimeout(this._clearStatusTimer);
        }

        this._clearStatusTimer = setTimeout(() => {
            this._clearStatusTimer = null;
            status.innerText = '';
        }, 1500);
    }

    _handleControlInput(el) {
        const descriptor = CONTROL_DESCRIPTOR[el.nodeName.toLowerCase()];
        const status = 0xb0 | (MIDI_CHANNEL - 1);
        const ccIndex = descriptor.ccBase + parseInt(el.id.split('-')[1]) - 1;
        const ccValue = descriptor.midiVal(el.value);
        this.postMessage('control', el.id, el.value, status, ccIndex, ccValue);
    }

    _saveConfig() {
        this.setState('config', JSON.stringify(this._config));
    }

    get _isMobile() {
        const ua = navigator.userAgent;
        return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
    }
    
}

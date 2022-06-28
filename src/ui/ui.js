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

const env = DISTRHO.env, helper = DISTRHO.UIHelper;

class ConsulUI extends DISTRHO.UI {

    constructor() {
        super();

        this._config = {};
        this._setupUi();

        document.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', ev => this._handleControlInput(el));
        });
    }

    messageReceived(args) {
        if ((args[0] == 'host2ui') && (args.length == 3)) {
            this._updateControlValue(args[1], args[2]);
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
                        this._updateControlValue(id, ui[id]);
                    }
                }
                this._showUi();
                break;
        }
    }

    _setupUi() {
        helper.enableOfflineModal(this);

        if (env.plugin) {
            const toolbar = document.getElementById('toolbar');
            toolbar.appendChild(helper.getQRButtonElement(this, {
                id: 'qr-button',
                modal: {
                    id: 'qr-modal'
                }
            }));
        }

        // CSS media query unusuable on Linux WebKitGTK
        if (env.noReliableScreenSize) {
            const className = 'force-landscape';
            document.body.classList.add(className);
            document.getElementById('main').classList.add(className);
            document.getElementById('mixer').classList.add(className);
            document.querySelectorAll('.landscape').forEach(el => {
                el.classList.add(className);
            });
        }

        if (this._isMobile) {
            const dv = window.innerHeight - main.clientHeight;
            const scale = 100 * (1 + dv / main.clientHeight);
            document.getElementById('main').style.transform = `scale(${scale}%)`;
        }

        if (env.dev) {
            this._showUi();
        }
    }

    _showUi() {
        document.body.style.visibility = 'visible';
    }

    // ui->host
    _handleControlInput(el) {
        const descriptor = CONTROL_DESCRIPTOR[el.nodeName.toLowerCase()];
        const status = 0xb0 | (MIDI_CHANNEL - 1);
        const ccIndex = descriptor.ccBase + parseInt(el.id.split('-')[1]) - 1;
        const ccValue = descriptor.midiVal(el.value);
        this.postMessage('ui2host', el.id, el.value, status, ccIndex, ccValue);
    }

    // host->ui
    _updateControlValue(id, value) {
        document.getElementById(id).value = value;
    }

    _saveConfig() {
        this.setState('config', JSON.stringify(this._config));
    }

    get _isMobile() {
        const ua = navigator.userAgent;
        return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
    }
    
}

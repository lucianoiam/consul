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
    'g-knob': {
        ccBase  : 0,
        midiVal : v => Math.floor(127 * v),
        strVal  : v => Math.round(100 * v) + '%',
    },
    'g-button': { 
        ccBase  : 0x10,
        midiVal : v => v ? 127 : 0,
        strVal  : v => v ? 'ON' : 'OFF'
    },
    'g-fader': {
        ccBase  : 0x20,
        midiVal : v => Math.floor(127 * v),
        strVal  : v => Math.round(100 * v) + '%'
    }
});

const env = DISTRHO.env,
      helper = DISTRHO.UIHelper,
      el = document.getElementById.bind(document);

class ConsulUI extends DISTRHO.UI {

    //
    // DPF + hiphop interface
    // 

    constructor() {
        super();

        this._config = {};
        this._showStatusTimer = null;
        this._hideStatusTimer = null;
        
        this._initView();
        this._initController();
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
                this._showView();
                break;
        }
    }

    messageReceived(args) {
        if ((args[0] == 'control') && (args.length == 3)) {
            el(args[1]).value = args[2];
        }
    }


    //
    // Controller
    //

    _initController() {
        helper.enableOfflineModal(this);

        el('show-about').addEventListener('input', ev => {
            if (! ev.target.value) { // up
                this._showAboutModal();
            }
        });

        el('show-midi').addEventListener('input', ev => {
            if (! ev.target.value) { // up
                this._showMidiModal();
            }
        });

        el('show-layout').addEventListener('input', ev => {
            if (! ev.target.value) { // up
                this._showLayoutModal();
            }
        });

        if (env.plugin || env.dev) {
            el('show-network').addEventListener('input', ev => {
                if (! ev.target.value) { // up
                    this._showNetworkModal();
                }
            });
        } else {
            const network = el('show-network');
            network.parentNode.removeChild(network);
        }

        el('modal-ok').addEventListener('input', ev => {
            if (! ev.target.value) { // up
                this._hideModal();
            }
        });

        document.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', _ => this._handleControlInput(el));
        });
    }

    _handleControlInput(el) {
        const descriptor = CONTROL_DESCRIPTOR[el.nodeName.toLowerCase()];
        const status = 0xb0 | (MIDI_CHANNEL - 1);
        const ccIndex = descriptor.ccBase + parseInt(el.id.split('-')[1]) - 1;
        const ccValue = descriptor.midiVal(el.value);

        this.postMessage('control', el.id, el.value, status, ccIndex, ccValue);

        const name = el.getAttribute('data-name').padEnd(10, ' ');
        const value = descriptor.strVal(el.value).padStart(4, ' ');

        this._showStatus(`${name}${value}`);
    }


    //
    // View related
    //

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
            this._zoomView();
            window.addEventListener('resize', _ => this._zoomView());
        } else if (! env.plugin) { // desktop browser
            el('main').style.borderRadius = '10px';
        }

        if (env.dev) {
            this._showView();
        }
    }

    _zoomView() {
        // Zoom interface to take up full window height
        const main = el('main');
        const dv = window.innerHeight - main.clientHeight; // can be negative
        const scale = 1.0 + dv / main.clientHeight;
        main.style.width = window.innerWidth / scale + 'px';
        main.style.transform = `scale(${100 * scale}%)`;
        // Remove minimum size restrictions
        document.body.style.minWidth = 'auto';
        document.body.style.minHeight = 'auto';
    }

    _showView() {
        document.body.style.visibility = 'visible';
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
        if (env.noReliableScreenSize) {
            if (this._showStatusTimer) {
                clearTimeout(this._showStatusTimer);
            }

            this._showStatusTimer = setTimeout(() => {
                apply();
            }, 20);

            return;
        }

        apply();
    }


    //
    // Modal dialogs
    //

    _showAboutModal() {
        this._showModal('about');
    }

    _showMidiModal() {
        this._showModal('midi');
    }

    _showLayoutModal() {
        this._showModal('layout');
    }

    async _showNetworkModal() {
        const qr = await helper.getQRCodeElement(this);
        qr.style.padding = '30px'; // +20px #modal-box
        this._showModal(qr);
    }

    _showModal(elem) {
        if (typeof(elem) === 'string') {
            elem = el('modal-temp').content.getElementById(elem).cloneNode(true);
        }

        el('modal-elem').appendChild(elem);
        el('modal-root').style.display = 'flex';
    }

    _hideModal() {
        el('modal-root').style.display = 'none';
        el('modal-elem').innerHTML = '';
    }
    

    //
    // Helper methods
    //

    get _isMobile() {
        const ua = navigator.userAgent;
        return /Android/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
    }

    _saveConfig() {
        this.setState('config', JSON.stringify(this._config));
    }

}

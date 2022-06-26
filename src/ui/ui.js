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
 
const CONTROL_DESCRIPTOR = Object.freeze({
    'g-knob'   : { ccBase: 0,    midiVal: v => Math.floor(127 * v) },
    'g-button' : { ccBase: 0x10, midiVal: v => v ? 127 : 0         },
    'g-fader'  : { ccBase: 0x20, midiVal: v => Math.floor(127 * v) }
});

class ConsulUI extends DISTRHO.UI {

    constructor() {
        super();

        document.body.style.visibility = 'visible';

        document.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', ev => this.handleInput(el));
        });
    }

    handleInput(el) {
        const descriptor = CONTROL_DESCRIPTOR[el.nodeName.toLowerCase()];
        const index = parseInt(el.id.split('-')[1]) - 1;
        const value = descriptor.midiVal(el.value);
        this.sendControlChange(descriptor.ccBase + index, value);
        this.broadcastMessage({id: el.id, val: el.value});
    }

    // There is no method for sending MIDI control changes messages in DPF, only
    // UI::sendNote() is available. See custom implementation in ConsulUI.cpp .
    sendControlChange(control, value) {
        this.postMessage('ConsulUI', 'sendControlChange', control, value);
    }

    messageReceived(args) {
        const control = document.getElementById(args.id);
        control.value = args.val;
    }

}

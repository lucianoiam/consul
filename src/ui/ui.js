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

    constructor() {
        super();

        document.body.style.visibility = 'visible';

        this.mixer.querySelectorAll('.control').forEach((el) => {
            el.addEventListener('input', (ev) => {
                this.broadcastMessage({id: el.id, val: el.value});
            });
        });
    }

    messageReceived(args) {
        const control = document.getElementById(args.id);

        if (control) {
            control.value = args.val;
        }
    }

    get mixer() {
        return document.getElementById('mixer');
    }

}

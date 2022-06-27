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

        if (DISTRHO.env.noReliableScreenSize) {
            // This is only needed for Linux GTK, otherwise it is handled by CSS.
            document.getElementById('title').style.display = 'none';
        }

        document.querySelectorAll('.control').forEach(el => {
            el.addEventListener('input', (ev) => {
                this.postMessage('ConsulUI', 'ui2host', el.id, el.value);
            });
        });
    }

    messageReceived(args) {
        if ((args[0] == 'ConsulUI') && (args[1] == 'host2ui') && (args.length == 4)) {
            document.getElementById(args[2]).value = args[3];
        }
    }

}

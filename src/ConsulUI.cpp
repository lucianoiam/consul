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

#include "WebUI.hpp"

class ConsulUI : public WebUI
{
public:
    ConsulUI()
        : WebUI(800 /*width*/, 540 /*height*/, 0x101010ff /*background*/)
    {}

    void onMessageReceived(const JSValue& args, uintptr_t context) override
    {
        if ((args[0].getString() != "ConsulUI") || (args[1].getString() != "ui2host")
                || (args.getArraySize() != 4)) {
            return;
        }

        const String id = args[2].getString();
        const double value = args[3].getNumber();

        d_stderr2("FIXME - send cc to Plugin %s = %g", id.buffer(), value);

        JSValue argsCopy = args;
        argsCopy.setArrayItem(1, "host2ui");

        broadcastMessage(argsCopy, /*exclude*/reinterpret_cast<Client>(context));
    }

};

UI* DISTRHO::createUI()
{
    return new ConsulUI();
}

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

#include "DistrhoPlugin.hpp"

class ConsulUI : public WebUI
{
public:
    ConsulUI()
        : WebUI(800 /*width*/, 540 /*height*/, 0x101010ff /*background*/)
    {}

    void onMessageReceived(const JSValue& args, uintptr_t context) override
    {
        if ((args[0].getString() != "ui2host") || (args.getArraySize() != 6)) {
            return;
        }

        // This method is not available in DPF, see implementation below.
        sendControlChange(
            static_cast<uint8_t>(args[3].getNumber()), // channel
            static_cast<uint8_t>(args[4].getNumber()), // index
            static_cast<uint8_t>(args[5].getNumber())  // value
        );

        // Keep all connected UIs in sync
        broadcastMessage({"host2ui", args[1], args[2]},
                        /*exclude*/reinterpret_cast<Client>(context));
    }

    void sendControlChange(uint8_t channel, uint8_t index, uint8_t value)
    {
        MidiEvent event;
        event.frame = 0; // hardcoded position
        event.size = 3;
        event.data[0] = 0xb0 | channel;
        event.data[1] = index;
        event.data[2] = value;
        event.dataExt = nullptr;
        
        setState("cc", String::asBase64(&event, sizeof(MidiEvent)));
    }

};

UI* DISTRHO::createUI()
{
    return new ConsulUI();
}

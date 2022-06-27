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

#define CC_BASE_INDEX_KNOB    0
#define CC_BASE_INDEX_BUTTON  0x10
#define CC_BASE_INDEX_FADER   0x20

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

        const String id = args[2].getString(); // k-00, b-00, f-00, k-01, ...

        uint8_t ccIndex = static_cast<uint8_t>(std::atoi(id.buffer() + 2));
        uint8_t ccValue;

        switch (id[0]) {
            case 'k':
                ccIndex += CC_BASE_INDEX_KNOB;
                ccValue = static_cast<uint8_t>(127.0 * args[3].getNumber());
                break;
            case 'b':
                ccIndex += CC_BASE_INDEX_BUTTON;
                ccValue = args[3].getBoolean() ? 127 : 0;
                break;
            case 'f':
                ccIndex += CC_BASE_INDEX_FADER;
                ccValue = static_cast<uint8_t>(127.0 * args[3].getNumber());
                break;
        }

        sendControlChange(0, ccIndex, ccValue);

        JSValue argsCopy = args;
        argsCopy.setArrayItem(1, "host2ui");

        broadcastMessage(argsCopy, /*exclude*/reinterpret_cast<Client>(context));
    }

    // This method is not available in DPF
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

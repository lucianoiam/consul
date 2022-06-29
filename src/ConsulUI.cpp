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

    void stateChanged(const char* key, const char* value) override
    {
        WebUI::stateChanged(key, value);

        if (::strcmp(key, "ui") == 0) {
            fState = JSValue::fromJSON(value);
        }
    }

    void onMessageReceived(const JSValue& args, uintptr_t context) override
    {
        if (args[0].getString() != "control") {
            return;
        }

        const int argc = args.getArraySize();
        if (argc < 5) {
            return;
        }

        sendMidiEvent(
            static_cast<uint8_t>(args[3].getNumber()),                // status
            static_cast<uint8_t>(args[4].getNumber()),                // data1
            argc > 5 ? static_cast<uint8_t>(args[5].getNumber()) : 0, // data2
            argc - 3   // size
        );

        const JSValue& id = args[1];
        const JSValue& value = args[2];

        // Persist UI state
        fState.setObjectItem(id.getString(), value);
        setState("ui", fState.toJSON());

        // Keep all connected UIs in sync
        broadcastMessage({"control", id, value}, /*exclude*/reinterpret_cast<Client>(context));
    }

    // DPF UI provides sendNote() only, see also ConsulPlugin.cpp .
    void sendMidiEvent(uint8_t status, uint8_t data1, uint8_t data2, uint32_t size)
    {
        MidiEvent event;
        event.frame = 0; // hardcoded position
        event.size = size;
        event.data[0] = status;
        event.data[1] = data1;
        event.data[2] = data2;
        event.dataExt = nullptr;
        
        setState("midi", String::asBase64(&event, sizeof(MidiEvent)));
    }

private:
    JSValue fState;

};

UI* DISTRHO::createUI()
{
    return new ConsulUI();
}

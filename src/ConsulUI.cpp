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

#include <functional>

#include "WebUI.hpp"

#include "DistrhoPlugin.hpp"

class ConsulUI : public WebUI
{
public:
    ConsulUI()
        : WebUI(800 /*width*/, 540 /*height*/, "#101010" /*background*/)
    {
        setFunctionHandler("control", 5, std::bind(&ConsulUI::onControl, this,
                            std::placeholders::_1, std::placeholders::_2));
    }

    void stateChanged(const char* key, const char* value) override
    {
        WebUI::stateChanged(key, value);

        if (::strcmp(key, "ui") == 0) {
            fState = Variant::fromJSON(value);
        }
    }

    // DPF UI provides sendNote() only, see also ConsulPlugin.cpp .
    void sendMidiEvent(uint8_t status, uint8_t data1, uint8_t data2, uint32_t size)
    {
        MidiEvent event;
        event.frame = 0;
        event.size = size;
        event.data[0] = status;
        event.data[1] = data1;
        event.data[2] = data2;
        event.dataExt = nullptr;
        
        setState("midi", String::asBase64(&event, sizeof(MidiEvent)));
    }

    void onControl(const Variant& args, uintptr_t origin) {
        size_t argc = args.getArraySize();

        const Variant& id = args[0];
        const Variant& value = args[1];

        sendMidiEvent(
            /*status*/ static_cast<uint8_t>(args[2].getNumber()),
            /* data1*/ static_cast<uint8_t>(args[3].getNumber()),
            /* data2*/ argc > 4 ? static_cast<uint8_t>(args[4].getNumber()) : 0,
            /*  size*/ argc - 2
        );

        // Save UI state
        fState.setObjectItem(id.getString(), value);
        setState("ui", fState.toJSON());

        // Keep all connected UIs in sync
        callback("onControl", { id, value }, kDestinationAll, /*exclude*/origin);
    }

private:
    Variant fState;

};

UI* DISTRHO::createUI()
{
    return new ConsulUI();
}

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

#include <string>
#include <unordered_map>

#include "DistrhoPlugin.hpp"
#include "DistrhoPluginInfo.h"

#include "extra/PluginEx.hpp"

START_NAMESPACE_DISTRHO

class ConsulPlugin : public PluginEx
{
public:
    ConsulPlugin()
        : PluginEx(0/*parameters*/, 0/*programs*/, 1/*states*/)
    {}

    virtual ~ConsulPlugin()
    {}

    const char* getLabel() const override
    {
        return DISTRHO_PLUGIN_NAME;
    }

    const char* getMaker() const override
    {
        return "Luciano Iam";
    }

    const char* getLicense() const override
    {
        return "GPLv3";
    }

    uint32_t getVersion() const override
    {
        return d_version(1, 0, 0);
    }

    int64_t getUniqueId() const override
    {
        return d_cconst('L', 'I', 'c', 's');
    }

    void initState(uint32_t index, State& state) override
    {
        PluginEx::initState(index, state);

        switch (index)
        {
        case 0:
            state.key = "ui_size";
            state.defaultValue = "";
            break;
        }

        // This is necessary because DISTRHO_PLUGIN_WANT_FULL_STATE==1
        fState[state.key.buffer()] = state.defaultValue;
    }

    void setState(const char* key, const char* value) override
    {
        PluginEx::setState(key, value);

        fState[key] = value;
    }

    String getState(const char* key) const override
    {
        StateMap::const_iterator it = fState.find(key);

        if (it == fState.end()) {
            return String();
        }
        
        return String(it->second.c_str());
    }

    void run(const float** inputs, float** outputs, uint32_t frames,
             const MidiEvent* midiEvents, uint32_t midiEventCount)
    {}

private:
    typedef std::unordered_map<std::string,std::string> StateMap;

    StateMap fState;

};

Plugin* createPlugin()
{
    return new ConsulPlugin;
}

END_NAMESPACE_DISTRHO

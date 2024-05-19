#!/usr/bin/make -f
# Makefile for DISTRHO Plugins #
# ---------------------------- #
# Created by falkTX
#

# --------------------------------------------------------------
# Project name, used for binaries

NAME = consul

# --------------------------------------------------------------
# Project version, used for generating unique symbol names

DPF_WEBUI_PROJECT_VERSION = 1

# --------------------------------------------------------------
# Enable Web UI control from devices in the local network

DPF_WEBUI_NETWORK_UI = true

# --------------------------------------------------------------
# Enable ARM and Intel fat binary for macOS

DPF_WEBUI_MACOS_UNIVERSAL ?= true

# --------------------------------------------------------------
# Support macOS down to High Sierra

DPF_WEBUI_MACOS_OLD = true

# --------------------------------------------------------------
# Enable Web UI by setting web files location

DPF_WEBUI_WEB_UI_PATH = src/ui

# --------------------------------------------------------------
# Files to build

FILES_DSP = \
    src/ConsulPlugin.cpp \
    src/ring_buffer.cc

FILES_UI  = \
    src/ConsulUI.cpp \
    src/ring_buffer.cc

# --------------------------------------------------------------
# Do some magic

include dpfwebui/Makefile.plugins.mk

# --------------------------------------------------------------
# Enable all possible plugin types

ifeq ($(PLUGIN_FORMAT),)
TARGETS += lv2_sep clap vst3 vst
else
TARGETS += $(PLUGIN_FORMAT)
ifeq ($(PLUGIN_FORMAT),vst3)
BASE_FLAGS += -DDISTRHO_PLUGIN_NUM_INPUTS=2 -DDISTRHO_PLUGIN_NUM_OUTPUTS=2
endif
endif

CXXFLAGS += -std=c++17
BASE_FLAGS += -Isrc
LXHELPER_CPPFLAGS += -Isrc

all: $(TARGETS) $(DPF_WEBUI_TARGET)

# --------------------------------------------------------------

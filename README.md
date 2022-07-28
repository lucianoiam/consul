# Consul

*Control Surface Library*

This is a VST2 & VST3 plugin providing a web user interface for controlling other plugins that support MIDI learn. The user interface is primarily designed for touch devices. The plugin is self-contained and no additional software is required; just insert it into the target plugin's chain (and before the target, so it receives MIDI events) and make sure the computer and client devices are connected to the same network.

<img width="1706" alt="Screen Shot 2022-07-26 at 09 58 17" src="https://user-images.githubusercontent.com/930494/180954979-4089c388-fdb9-48ff-9434-b007a8b4a65f.png">

Example use case: tweak a virtual guitar amp's parameters from a Wi-Fi tablet.

![demo](https://user-images.githubusercontent.com/930494/181484970-1d439e1c-4f45-40f8-afb9-02b49b325a5d.gif)

Remotely accessing the UI is easy, with three options available:

- Scan the plugin QR code available from the menu bar
- Use a Zeroconf/Bonjour app for discovery on [Android](https://play.google.com/store/apps/details?id=de.wellenvogel.bonjourbrowser) or [iOS](https://apps.apple.com/us/app/bonjour-search-for-http-web-in-wi-fi/id1097517829)
- Use a minimal dedicated app called [pisco](https://github.com/lucianoiam/pisco) (Android only)

![IMG_1883](https://user-images.githubusercontent.com/930494/180954991-4a5f0d41-a07c-4394-a493-6f7f341ed7cf.jpg)

Known bugs: VST3 not working on Ableton Live, use the VST2 version on this DAW instead.

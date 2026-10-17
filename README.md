# Azuria Launcher

A Minecraft Java launcher for managing instances, accounts, skins and modded installations.

[Download for Windows](https://github.com/jamesb123450/azuria-releases/releases/latest) · [Release history](https://github.com/jamesb123450/azuria-releases/releases) · [Website](https://jamesb123450.github.io/azuria-releases/) · [Report an issue](https://github.com/jamesb123450/azuria-releases/issues)

This public distribution repository hosts signed Windows installers, updater manifests, release notes and the compiled website. Launcher source is maintained separately. Source archives attached by GitHub contain this distribution repository, not the launcher's source.

Download the `.exe` installer from the latest release. The launcher checks for signed updates automatically. The `.sig` and `latest.json` assets support automatic updates and do not need to be opened manually.

## Accounts and local data

Launcher data is stored under `%APPDATA%\AzuriaLauncher`, including the `instances` folder. Back up instance folders before modifying or recovering data. Deleted instances are kept in local trash; do not overwrite an active instance when attempting manual recovery. Close the launcher and keep a separate copy before moving files.

Microsoft account refresh credentials and provider API keys use Windows Credential Manager. Never include credentials, tokens or private logs in public issue reports. Report problems with your launcher version, Windows version and reproduction steps.

Azuria is not affiliated with Microsoft or Mojang. Minecraft Java ownership and a Microsoft account are required to play.

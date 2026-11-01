# Aeris Météo

A weather web app whose whole atmosphere follows the sky of the city you are looking at. Search any city, see the current conditions, the next 24 hours and a 7-day outlook, while the background, light and particles (rain, snow, storm flashes, stars) adapt to the weather and the time of day.

Built with plain HTML, CSS and JavaScript (ES modules). No framework, no build step, no API key.

## Overview

Most weather pages are dense tables of numbers. Aeris puts the feeling first: one large temperature, a clear condition icon, and an ambiance that changes with the weather, with the practical details (hourly strip, week, wind, UV, sunrise and sunset) one glance below.

The interface is in French. The code, comments and this documentation are in English.

## Features

- City search with live suggestions and keyboard navigation (arrow keys, Enter, Escape)
- Geolocation through the browser's position permission
- Current temperature, "feels like" temperature, condition, daily high and low
- Hourly forecast for the next 24 hours, scrollable by touch, wheel or mouse drag
- 7-day forecast with a temperature range bar per day and rain probability
- Detail tiles: wind speed and direction, humidity, UV index, rain probability, pressure, sunrise and sunset with the sun's position
- Celsius / Fahrenheit switch (wind switches between km/h and mph)
- Light and dark themes; until you choose one, the app switches to dark when it is night at the displayed location
- Weather-driven backgrounds with cross-fade transitions, animated clouds, a sun or moon glow, and canvas particles (rain, storm, snow, stars)
- Recent cities (last five) and a set of default cities, remembered between visits
- Skeleton loading state, top progress bar, non-blocking toast notifications
- Responsive layout for mobile, tablet and desktop

## Screenshots

> **Screenshots to add.** This section is intentionally a placeholder: add real captures of the running app to `assets/screenshots/` and reference them here.

<!--
Suggested captures:
![Desktop, light theme](assets/screenshots/desktop-light.png)
![Desktop, dark theme at night](assets/screenshots/desktop-dark-night.png)
![Mobile, rainy weather](assets/screenshots/mobile-rain.png)
-->

## Tech Stack

- **HTML5**: semantic structure, inline SVG sprite for weather icons
- **CSS3**: custom properties for theming, Grid and Flexbox, `clamp()` fluid typography, `backdrop-filter` glass effect, keyframe animations, `prefers-reduced-motion`
- **JavaScript (ES2022 modules)**: no dependencies, no bundler
- **Canvas 2D**: weather particles
- **Google Fonts**: [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Manrope](https://fonts.google.com/specimen/Manrope)
- **Open-Meteo**: forecast and geocoding APIs

## Project Structure

```text
aeris-meteo/
├── index.html        Semantic markup and the SVG icon sprite
├── css/
│   └── style.css     Design tokens, layout, themes, animations, responsive rules
├── js/
│   ├── app.js        Entry point: state, event wiring, coordination
│   ├── api.js        Open-Meteo requests (forecast, geocoding) and error type
│   ├── weather.js    Pure weather logic: code mapping, unit conversion, view model
│   ├── sky.js        Animated sky: gradient layers and canvas particles
│   ├── ui.js         DOM rendering, toasts, loading/error states, suggestions
│   └── storage.js    localStorage wrapper for unit, theme and recent cities
├── .gitignore
└── README.md
```

## Getting Started

The app uses JavaScript ES modules, which browsers refuse to load when `index.html` is opened directly from the file system (`file://`). Serve the folder over HTTP instead. An internet connection is required for the weather data and the fonts.

### Option 1: VS Code with Live Server (Windows)

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Open the `aeris-meteo` folder: **File → Open Folder…**
3. Open the Extensions view (`Ctrl+Shift+X`), search for **Live Server** (by Ritwick Dey) and install it.
4. Right-click `index.html` in the Explorer and choose **Open with Live Server**.
5. The app opens at `http://127.0.0.1:5500` (the port may differ).

### Option 2: Python

If [Python](https://www.python.org/downloads/windows/) is installed, open a terminal in the project folder (in VS Code: **Terminal → New Terminal**) and run:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`. Stop the server with `Ctrl+C`.

### Option 3: Node.js

```powershell
npx serve .
```

Then open the address printed in the terminal.

Geolocation only works on `localhost` or over HTTPS, which all options above satisfy.

## API & Data Sources

Weather data and city search are provided by [Open-Meteo](https://open-meteo.com/):

- Forecast API: `https://api.open-meteo.com/v1/forecast`
- Geocoding API: `https://geocoding-api.open-meteo.com/v1/search`

Per Open-Meteo's [terms of use](https://open-meteo.com/en/terms) at the time of writing, the free API requires no key and is for **non-commercial use**, within 10,000 calls per day, 5,000 per hour and 600 per minute. The data is licensed under **CC BY 4.0**, which requires attribution: the app displays a "Weather data by Open-Meteo.com" link in its footer. Commercial use requires a paid subscription. Please check the current terms before deploying publicly.

Fonts are loaded from Google Fonts (open-source families). The weather icons are original inline SVG drawn for this project.

## Architecture

The code is split by responsibility, and data flows in one direction:

```text
 api.js ──► weather.js ──► app.js ──► ui.js / sky.js
 (fetch)    (model)       (state)     (rendering)
                             ▲
                         storage.js
                       (preferences)
```

- **API (`api.js`)** only performs network requests and returns JSON. Failures are normalized into an `ApiError`; cancelled requests are left to the caller.
- **Business logic (`weather.js`)** has no DOM and no network access. It turns the raw payload into a compact view model and handles WMO weather-code mapping and unit conversion, so it can be tested in isolation.
- **Interface (`ui.js`, `sky.js`)** renders a model and never fetches data. `sky.js` isolates the animated atmosphere (gradients and canvas).
- **Storage (`storage.js`)** is the only module that touches `localStorage`.
- **Coordination (`app.js`)** holds the state (unit, theme, place, forecast), handles events and connects the modules. Stale responses are ignored so a slow request can never overwrite a newer one.

## Error Handling & Accessibility

**Error handling**

- Network or HTTP failures when loading weather show a toast if data is already on screen, or a full error panel with a **Retry** button if nothing has loaded yet
- A search with no match shows an inline message in the suggestions list
- Denied or unsupported geolocation shows a toast
- Unavailable `localStorage` (private mode, quota) is tolerated: preferences just do not persist
- City names coming from the API are HTML-escaped before being inserted into the page

**Accessibility**

- Landmarks (`header`, `nav`, `main`, `footer`), a single `h1`, labelled icon buttons
- Search field exposed as a combobox with `aria-expanded`, listbox options and `aria-selected`
- Toasts announced through an `aria-live` region; decorative icons are `aria-hidden`
- Visible keyboard focus styles; the hourly strip is keyboard-scrollable
- `prefers-reduced-motion` disables animations, particle movement and the temperature count-up

This has not been audited with a screen reader or a formal contrast checker.

## Limitations

- Must be served over HTTP; opening `index.html` via `file://` does not work
- Depends on Open-Meteo availability and its non-commercial usage limits
- Interface language is French only
- Geolocation shows the place as "Ma position" (no reverse geocoding)
- Recent cities are deduplicated by name, so two different places with the same name collapse into one
- Some weather codes share an icon (for example drizzle and rain)
- Fonts load from Google Fonts, so the first paint depends on that request
- No automated test suite yet; cross-browser and cross-device testing is manual

## Future Improvements

These are ideas, not implemented features:

- Unit tests for `weather.js` and `api.js`
- Reverse geocoding for the geolocation result
- English interface and language switch
- Installable PWA with offline fallback of the last forecast
- Shareable URLs per city
- Air quality, weather alerts and a precipitation radar
- Self-hosted fonts

## License

No license file is included yet. Until one is added, default copyright applies and the code may not be reused without the author's permission. A license will be added once the author has chosen one.


## NOOR DIGITAL

Aeris Météo is part of the **NOOR DIGITAL** portfolio — *La lumière qui structure*.

- **Live demo:** https://noor-digital.github.io/aeris-meteo/
- **GitHub:** https://github.com/noor-digital
- **Portfolio:** https://noor-digital.github.io/noor-digital-portfolio/

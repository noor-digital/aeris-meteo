/**
 * weather.js — weather domain logic, free of DOM and network access.
 * Turns the raw Open-Meteo payload into a compact model and provides
 * condition mapping and unit conversions.
 */

/** Maps a WMO weather code to a visual kind (drives icons and sky) and a French label. */
export function describe(code) {
  if (code <= 1) return { kind: 'clear', label: code ? 'Plutôt dégagé' : 'Ciel dégagé' };
  if (code === 2) return { kind: 'pc', label: 'Partiellement nuageux' };
  if (code === 3) return { kind: 'cloud', label: 'Couvert' };
  if (code <= 48) return { kind: 'fog', label: 'Brouillard' };
  if (code <= 57) return { kind: 'rain', label: 'Bruine' };
  if (code <= 65) return { kind: 'rain', label: 'Pluie' };
  if (code <= 67) return { kind: 'rain', label: 'Pluie verglaçante' };
  if (code <= 77) return { kind: 'snow', label: 'Neige' };
  if (code <= 82) return { kind: 'rain', label: 'Averses' };
  if (code <= 86) return { kind: 'snow', label: 'Averses de neige' };
  return { kind: 'storm', label: 'Orage' };
}

/** Id of the SVG symbol (defined in index.html) for a kind and day/night state. */
export function iconId(kind, isDay) {
  if (kind === 'clear') return isDay ? 'sun' : 'moon';
  if (kind === 'pc') return isDay ? 'pc' : 'pn';
  return kind;
}

export const toTemp = (celsius, unit) => Math.round(unit === 'f' ? (celsius * 9) / 5 + 32 : celsius);
export const toWind = (kmh, unit) => Math.round(unit === 'f' ? kmh / 1.609 : kmh);

export function uvLabel(uv) {
  if (uv < 3) return 'Faible';
  if (uv < 6) return 'Modéré';
  if (uv < 8) return 'Élevé';
  if (uv < 11) return 'Très élevé';
  return 'Extrême';
}

/** "HH:MM" from an ISO local time such as "2026-10-23T14:30". */
export const clockTime = (iso) => iso.slice(11, 16);

const minutesOfDay = (iso) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * Builds the view model used by the UI. Temperatures stay in °C and wind in km/h;
 * conversion to the user's unit happens at display time.
 */
export function parseForecast(raw) {
  const { current: c, hourly: h, daily: d } = raw;
  const { kind, label } = describe(c.weather_code);

  // Local time of the place, so the hourly strip starts at the current hour.
  const start = Math.max(0, h.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13)));
  const hourly = h.time.slice(start, start + 25).map((time, j) => {
    const i = start + j;
    return {
      time,
      temp: h.temperature_2m[i],
      kind: describe(h.weather_code[i]).kind,
      isDay: h.is_day[i] === 1,
      pop: h.precipitation_probability[i],
    };
  });

  const daily = d.time.map((date, i) => ({
    date,
    kind: describe(d.weather_code[i]).kind,
    min: d.temperature_2m_min[i],
    max: d.temperature_2m_max[i],
    pop: d.precipitation_probability_max[i],
  }));

  const sunrise = minutesOfDay(d.sunrise[0]);
  const sunset = minutesOfDay(d.sunset[0]);
  const now = minutesOfDay(c.time);

  return {
    current: {
      time: c.time,
      temp: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      pressure: c.surface_pressure,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      isDay: c.is_day === 1,
      kind,
      label,
    },
    hourly,
    daily,
    today: {
      uv: d.uv_index_max[0],
      pop: d.precipitation_probability_max[0] ?? 0,
      sunrise: d.sunrise[0],
      sunset: d.sunset[0],
      sunProgress: clamp01((now - sunrise) / (sunset - sunrise)),
      sunIsUp: now >= sunrise && now <= sunset,
    },
  };
}

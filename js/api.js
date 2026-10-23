/**
 * api.js — network access to the Open-Meteo forecast and geocoding APIs.
 * No API key required. This module only fetches and returns data;
 * interpretation lives in weather.js.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const CURRENT = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'weather_code',
  'wind_speed_10m', 'wind_direction_10m', 'is_day', 'surface_pressure',
];
const HOURLY = ['temperature_2m', 'weather_code', 'precipitation_probability', 'is_day'];
const DAILY = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'sunrise', 'sunset',
  'uv_index_max', 'precipitation_probability_max',
];

export class ApiError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Network unreachable');
  }
  if (!response.ok) throw new ApiError(`HTTP ${response.status}`, { status: response.status });
  return response.json();
}

/** Searches cities by name. Returns [{ name, country, admin, lat, lon }]. */
export async function searchCities(query, { signal } = {}) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=fr`;
  const json = await getJson(url, signal);
  return (json.results || []).map((r) => ({
    name: r.name,
    country: r.country || '',
    admin: r.admin1 || '',
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** Fetches current conditions, 7 days of hourly and daily data in the place's timezone. */
export function fetchForecast({ lat, lon }, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: CURRENT.join(','),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
    timezone: 'auto',
    forecast_days: 7,
  });
  return getJson(`${FORECAST_URL}?${params}`, signal);
}

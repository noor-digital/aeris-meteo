/**
 * app.js — entry point. Owns the application state and wires the modules together:
 * api (data) -> weather (model) -> ui / sky (rendering), with storage for preferences.
 */
import { searchCities, fetchForecast } from './api.js';
import { parseForecast } from './weather.js';
import * as storage from './storage.js';
import { initSky, updateSky } from './sky.js';
import * as ui from './ui.js';

const DEFAULT_CITIES = [
  { name: 'Paris', country: 'France', lat: 48.85, lon: 2.35 },
  { name: 'Tokyo', country: 'Japon', lat: 35.68, lon: 139.69 },
  { name: 'New York', country: 'États-Unis', lat: 40.71, lon: -74.01 },
  { name: 'Reykjavik', country: 'Islande', lat: 64.15, lon: -21.94 },
  { name: 'Sydney', country: 'Australie', lat: -33.87, lon: 151.21 },
];

const savedTheme = storage.getTheme();
const state = {
  unit: storage.getUnit(),
  theme: savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  themeIsAuto: !savedTheme, // until the user picks a theme, nights switch to dark automatically
  place: null,
  forecast: null,
};

/* ---------- rendering ---------- */

function refreshSky() {
  const { kind, isDay } = state.forecast.current;
  updateSky({ kind, isDay, theme: state.theme });
}

let chipPlaces = [];
function refreshChips() {
  const recent = storage.getRecent();
  chipPlaces = [...recent, ...DEFAULT_CITIES.filter((d) => !recent.some((r) => r.name === d.name))].slice(0, 6);
  ui.renderChips(chipPlaces, state.place?.name);
}

function render() {
  refreshSky();
  refreshChips();
  ui.renderWeather(state.forecast, state.place, state.unit);
}

/* ---------- preferences ---------- */

function setTheme(theme, { persist = false } = {}) {
  state.theme = theme;
  ui.applyTheme(theme);
  if (persist) {
    storage.saveTheme(theme);
    state.themeIsAuto = false;
  }
  if (state.forecast) refreshSky();
}

function setUnit(unit) {
  state.unit = unit;
  storage.saveUnit(unit);
  ui.setUnitButtons(unit);
  if (state.forecast) render();
}

/* ---------- loading weather ---------- */

let requestId = 0;
async function loadWeather(place, { quiet = false } = {}) {
  const id = ++requestId;
  const previous = state.place;
  state.place = place;
  ui.showError(false);
  ui.setLoading(true);
  try {
    const forecast = parseForecast(await fetchForecast(place));
    if (id !== requestId) return; // a newer request superseded this one
    state.forecast = forecast;
    storage.addRecent(place);
    if (state.themeIsAuto && !forecast.current.isDay && state.theme !== 'dark') setTheme('dark');
    render();
    if (!quiet) ui.toast(`Météo de ${place.name} mise à jour`);
  } catch {
    if (id !== requestId) return;
    if (!state.forecast) {
      ui.showError(true);
    } else {
      state.place = previous;
      refreshChips();
      ui.toast('Impossible de récupérer la météo. Réessaie dans un instant.', 'err');
    }
  } finally {
    if (id === requestId) ui.setLoading(false);
  }
}

/* ---------- search ---------- */

let suggestions = [];
let activeIndex = -1;
let searchTimer;
let searchController;

/** Fetches suggestions and displays them. Resolves to the list, or null if superseded or failed. */
async function suggest(query) {
  searchController?.abort();
  searchController = new AbortController();
  try {
    suggestions = await searchCities(query, { signal: searchController.signal });
    activeIndex = -1;
    ui.renderSuggestions(suggestions);
    return suggestions;
  } catch (error) {
    if (error.name !== 'AbortError') ui.toast('Recherche impossible pour le moment.', 'err');
    return null;
  }
}

function pick(index) {
  const place = suggestions[index];
  if (!place) return;
  ui.closeSuggestions();
  ui.els.input.value = '';
  ui.els.input.blur();
  loadWeather(place);
}

function bindEvents() {
  const { input, form, suggestions: list } = ui.els;

  ui.els.unitC.addEventListener('click', () => setUnit('c'));
  ui.els.unitF.addEventListener('click', () => setUnit('f'));
  ui.els.theme.addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark', { persist: true });
    ui.toast(state.theme === 'dark' ? 'Mode sombre activé' : 'Mode clair activé');
  });

  ui.els.chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) loadWeather(chipPlaces[chip.dataset.i]);
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const query = input.value.trim();
    if (query.length < 2) { searchController?.abort(); ui.closeSuggestions(); return; }
    searchTimer = setTimeout(() => suggest(query), 260);
  });

  input.addEventListener('keydown', (e) => {
    const count = suggestions.length;
    if (list.hidden || !count) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
      ui.setActiveSuggestion(activeIndex);
    }
    if (e.key === 'Escape') { ui.closeSuggestions(); activeIndex = -1; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (activeIndex >= 0) return pick(activeIndex);
    const query = input.value.trim();
    if (!query) return;
    if (suggestions.length && !list.hidden) return pick(0);
    const found = await suggest(query);
    if (found?.length) pick(0);
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('li[data-i]');
    if (item) pick(Number(item.dataset.i));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#sf')) ui.closeSuggestions(); });

  ui.els.geo.addEventListener('click', () => {
    if (!navigator.geolocation) {
      ui.toast('La géolocalisation n’est pas disponible sur cet appareil.', 'err');
      return;
    }
    ui.setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeather({ name: 'Ma position', country: '', lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        ui.setLoading(false);
        ui.toast('Position refusée. Autorise l’accès ou cherche une ville.', 'err');
      },
      { timeout: 9000 },
    );
  });

  ui.els.retry.addEventListener('click', () => loadWeather(state.place || DEFAULT_CITIES[0]));
}

/* ---------- start ---------- */

initSky();
ui.initHourlyDrag();
setTheme(state.theme);
ui.setUnitButtons(state.unit);
updateSky({ kind: 'clear', isDay: true, theme: state.theme });
refreshChips();
bindEvents();
loadWeather(storage.getRecent()[0] || DEFAULT_CITIES[0], { quiet: true });

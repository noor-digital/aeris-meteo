/**
 * ui.js — everything that touches the DOM: rendering the weather model,
 * toasts, loading/error states, theme and unit controls, search suggestions.
 * It receives data and returns nothing but side effects; it never fetches.
 */
import { iconId, toTemp, toWind, uvLabel, clockTime } from './weather.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector) => document.querySelector(selector);

export const els = {
  app: $('#app'),
  error: $('#err'),
  retry: $('#retry'),
  form: $('#sf'),
  input: $('#q'),
  suggestions: $('#sg'),
  geo: $('#geo'),
  chips: $('#chips'),
  unitC: $('#uC'),
  unitF: $('#uF'),
  theme: $('#th'),
};

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const icon = (kind, isDay) => `<svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${iconId(kind, isDay)}"/></svg>`;

/* ---------- loading, error, toasts ---------- */

export function setLoading(isLoading) {
  document.body.classList.toggle('busy', isLoading);
  els.app.classList.toggle('loading', isLoading);
}

export function showError(visible) {
  els.error.hidden = !visible;
  els.app.hidden = visible;
}

export function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 420);
  }, 3600);
}

/* ---------- theme and units ---------- */

const THEME_ICON = {
  light: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  dark: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
};

/** Applies the theme and shows the icon of the theme the button will switch to. */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#thp').setAttribute('d', THEME_ICON[theme === 'dark' ? 'light' : 'dark']);
}

export function setUnitButtons(unit) {
  els.unitC.setAttribute('aria-pressed', unit === 'c');
  els.unitF.setAttribute('aria-pressed', unit === 'f');
}

/* ---------- city chips and search suggestions ---------- */

export function renderChips(places, currentName) {
  els.chips.innerHTML = places.map((p, i) =>
    `<button class="chip" data-i="${i}" ${p.name === currentName ? 'aria-current="true"' : ''}>${escapeHtml(p.name)}</button>`,
  ).join('');
}

export function renderSuggestions(list) {
  els.suggestions.innerHTML = list.length
    ? list.map((p, i) => `<li role="option" data-i="${i}"><span>${escapeHtml(p.name)}</span><small>${escapeHtml([p.admin, p.country].filter(Boolean).join(', '))}</small></li>`).join('')
    : '<li role="option" style="cursor:default"><small>Aucune ville trouvée. Vérifie l’orthographe.</small></li>';
  els.suggestions.hidden = false;
  els.input.setAttribute('aria-expanded', 'true');
}

export function closeSuggestions() {
  els.suggestions.hidden = true;
  els.input.setAttribute('aria-expanded', 'false');
}

export function setActiveSuggestion(index) {
  [...els.suggestions.children].forEach((li, i) => li.setAttribute('aria-selected', i === index));
}

/* ---------- weather rendering ---------- */

let shownTemp = 0;

function countTo(target) {
  const el = $('#tv');
  const from = shownTemp;
  shownTemp = target;
  if (reduceMotion || from === target) { el.textContent = target; return; }
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min((t - t0) / 900, 1);
    el.textContent = Math.round(from + (target - from) * (1 - (1 - p) ** 4));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

/** Renders the whole weather view for a view model (see weather.parseForecast). */
export function renderWeather(model, place, unit) {
  const { current: c, hourly, daily, today } = model;
  const T = (v) => toTemp(v, unit);

  $('#city').textContent = place.name + (place.country ? `, ${place.country}` : '');
  $('#date').textContent = `${new Date(c.time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${clockTime(c.time)}`;
  countTo(T(c.temp));
  $('#tb').setAttribute('aria-label', `${T(c.temp)} degrés`);
  $('#cond').textContent = c.label;
  $('#art').innerHTML = icon(c.kind, c.isDay);
  $('#pills').innerHTML = `<span class="pill">↑ ${T(daily[0].max)}°</span><span class="pill">↓ ${T(daily[0].min)}°</span><span class="pill">Ressenti ${T(c.feelsLike)}°</span>`;

  const hr = $('#hr');
  hr.innerHTML = hourly.map((h, j) => `<li class="hr${j ? '' : ' now'}"><span>${j ? clockTime(h.time) : 'Maintenant'}</span>${icon(h.kind, h.isDay)}<b>${T(h.temp)}°</b><small>${h.pop >= 20 ? `💧${h.pop}%` : ''}</small></li>`).join('');
  hr.scrollLeft = 0;

  const lowest = Math.min(...daily.map((d) => d.min));
  const highest = Math.max(...daily.map((d) => d.max));
  const range = highest - lowest || 1;
  $('#dy').innerHTML = daily.map((d, j) => {
    const left = ((d.min - lowest) / range) * 100;
    const span = ((d.max - d.min) / range) * 100;
    const name = j ? new Date(`${d.date}T12:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') : 'Auj.';
    return `<li class="dy"><b>${name}</b>${icon(d.kind, true)}<span class="pp">${d.pop >= 20 ? `${d.pop}%` : ''}</span><span class="lo">${T(d.min)}°</span><span class="bar"><i style="left:${left}%;width:${Math.max(span, 8)}%"></i></span><span class="hi">${T(d.max)}°</span></li>`;
  }).join('');

  const sunX = 100 - 90 * Math.cos(Math.PI * today.sunProgress);
  const sunY = 92 - 84 * Math.sin(Math.PI * today.sunProgress);
  $('#tiles').innerHTML = `<div class="tile glass lift"><small>Vent</small><b>${toWind(c.windSpeed, unit)} <em>${unit === 'f' ? 'mph' : 'km/h'}</em></b><svg class="arrow" viewBox="0 0 24 24" style="transform:rotate(${c.windDirection + 180}deg)"><path d="M12 3l6 16-6-4-6 4z" fill="currentColor"/></svg></div>
 <div class="tile glass lift"><small>Humidité</small><b>${c.humidity}%</b><div class="meter"><i style="width:${c.humidity}%"></i></div></div>
 <div class="tile glass lift"><small>Indice UV</small><b>${Math.round(today.uv)}</b><em>${uvLabel(today.uv)}</em></div>
 <div class="tile glass lift"><small>Risque de pluie</small><b>${today.pop}%</b><div class="meter"><i style="width:${today.pop}%"></i></div></div>
 <div class="tile glass lift wide"><div class="sunt"><span>Lever ${clockTime(today.sunrise)}</span><span>Coucher ${clockTime(today.sunset)}</span></div><svg class="arc" viewBox="0 0 200 100" aria-label="Course du soleil"><path d="M10 92A90 90 0 0 1 190 92"/><circle class="sd" cx="${sunX}" cy="${sunY}" r="7" ${today.sunIsUp ? '' : 'opacity=".35"'}/></svg></div>
 <div class="tile glass lift wide"><small>Pression</small><b>${Math.round(c.pressure)} <em>hPa</em></b></div>`;

  // Restart the staggered entrance animation.
  els.app.classList.remove('go');
  void els.app.offsetWidth;
  els.app.classList.add('go');
  document.title = `${T(c.temp)}° ${place.name} · Aeris`;
}

/* ---------- hourly strip: mouse drag-to-scroll ---------- */

export function initHourlyDrag() {
  const strip = $('#hr');
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    startX = e.clientX;
    startLeft = strip.scrollLeft;
    strip.classList.add('drag');
  });
  addEventListener('pointermove', (e) => { if (dragging) strip.scrollLeft = startLeft - (e.clientX - startX); });
  addEventListener('pointerup', () => { dragging = false; strip.classList.remove('drag'); });
}

/**
 * sky.js — animated atmosphere: gradient backgrounds that cross-fade with the
 * weather and time of day, plus canvas particles (rain, storm flashes, snow, stars).
 */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// [light theme colors, dark theme colors] per weather kind.
const PALETTES = {
  clear: [['#5aa9f0', '#a8d4fb', '#ffe2ae'], ['#0a2350', '#1e5aa8', '#c8703c']],
  cloud: [['#9db3c9', '#cdd9e5', '#eaf0f5'], ['#18222f', '#2c3f54', '#4b5f76']],
  rain: [['#6f89a5', '#9db3c6', '#c9d6e0'], ['#0c1824', '#1c3246', '#33506b']],
  snow: [['#aec6df', '#dbe8f5', '#f5f9fd'], ['#18283b', '#365170', '#6c8cae']],
  storm: [['#5d6286', '#8f92b3', '#bfbdd3'], ['#0f0c22', '#26214a', '#4a3d7a']],
  fog: [['#aab3ba', '#d1d6da', '#e9ebed'], ['#1a2024', '#2f383e', '#4b555c']],
};
const NIGHT = ['#03071a', '#0c1a40', '#2a2e6c'];

let canvas;
let ctx;
let fxKind = null;
let theme = 'light';
let particles = [];
let flash = 0;
let width = 0;
let height = 0;
let lastFrame = 0;

/** Call once after the DOM is ready. */
export function initSky() {
  canvas = document.querySelector('#fx');
  ctx = canvas.getContext('2d');
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resetParticles, 200);
  });
  requestAnimationFrame(loop);
}

/** Updates gradient, sun/moon glow, clouds and particles for the given conditions. */
export function updateSky({ kind, isDay, theme: nextTheme }) {
  theme = nextTheme;
  const dark = theme === 'dark';
  const key = kind === 'pc' ? 'clear' : kind;
  const clearish = key === 'clear';
  const colors = dark && !isDay && clearish ? NIGHT : PALETTES[key][dark ? 1 : 0];

  // Cross-fade: add the new gradient layer, then drop the older ones once it is visible.
  const sky = document.querySelector('#sky');
  const layer = document.createElement('div');
  layer.className = 'layer';
  layer.style.background = `linear-gradient(172deg,${colors[0]},${colors[1]} 55%,${colors[2]})`;
  sky.append(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    layer.classList.add('on');
    setTimeout(() => [...sky.children].slice(0, -1).forEach((el) => el.remove()), 1500);
  }));

  const root = document.documentElement.style;
  root.setProperty('--g', colors[1]);
  root.setProperty('--orb', clearish
    ? (isDay ? (dark ? 'rgba(255,150,70,.5)' : 'rgba(255,214,120,.95)') : 'rgba(170,190,255,.3)')
    : 'rgba(255,255,255,.14)');
  document.body.dataset.c = key === 'clear' ? 0 : 1;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', colors[0]);

  fxKind = kind === 'rain' || kind === 'storm' ? kind
    : kind === 'snow' ? 'snow'
      : !isDay && dark && clearish ? 'stars' : null;
  resetParticles();
}

function resetParticles() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  width = innerWidth;
  height = innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = { rain: 130, storm: 190, snow: 90, stars: 90 }[fxKind] || 0;
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    l: 10 + Math.random() * 16,
    v: fxKind === 'storm' ? 900 + Math.random() * 500 : 500 + Math.random() * 400,
    r: Math.random() * 2.2 + 0.6,
    p: Math.random() * 6.3,
  }));
}

function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastFrame) / 1000, 0.05);
  lastFrame = t;
  if (document.hidden) return;
  ctx.clearRect(0, 0, width, height);
  if (!fxKind) return;

  if (fxKind === 'rain' || fxKind === 'storm') {
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,.5)' : 'rgba(30,60,100,.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const p of particles) {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.l * 0.18, p.y + p.l);
      if (!reduceMotion) { p.y += p.v * dt; p.x -= p.v * dt * 0.18; }
      if (p.y > height) { p.y = -20; p.x = Math.random() * width + 60; }
    }
    ctx.stroke();
    if (fxKind === 'storm' && !reduceMotion) {
      if (Math.random() < 0.004) flash = 0.55;
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash})`;
        ctx.fillRect(0, 0, width, height);
        flash -= dt * 1.6;
      }
    }
  } else if (fxKind === 'snow') {
    ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.95)';
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(p.p) * 14, p.y, p.r + 0.6, 0, 6.3);
      ctx.fill();
      if (!reduceMotion) { p.y += (p.v / 9 + 20) * dt; p.p += dt; }
      if (p.y > height + 5) { p.y = -5; p.x = Math.random() * width; }
    }
  } else {
    for (const p of particles) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.6 * Math.abs(Math.sin(p.p))})`;
      ctx.fillRect(p.x, p.y * 0.8, p.r * 0.7, p.r * 0.7);
      if (!reduceMotion) p.p += dt * 0.8;
    }
  }
}

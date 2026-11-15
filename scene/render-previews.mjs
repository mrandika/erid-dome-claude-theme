// Renders the README preview GIFs in docs/previews/ from the generated scenes.
//
// Each scene is opened in headless Chromium, every CSS animation is paused, and
// the clock is stepped frame by frame (so the GIFs are exact, not screen
// recordings). ffmpeg then turns the frames into a GIF with one palette and no
// dithering, which keeps the pixel art clean.
//
// Needs: ffmpeg on PATH, and playwright-core (`npm i -D playwright-core`).
// Set CHROME_PATH to a Chrome/Chromium binary if Playwright can't find one.
//
//   node scene/render-previews.mjs            # all previews
//   node scene/render-previews.mjs ask amaze  # only these

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/previews');
const FPS = 10;
// 960 px wide = 4 screen pixels per art pixel (the grid is 240 cells wide).
const W = 960, H = 540;

// name, scene file, colour scheme, seconds to capture
const PREVIEWS = [
  ['idle-day', 'erid-dome.svg', 'light', 8],
  ['idle-night', 'erid-dome.svg', 'dark', 8],
  ['working', 'erid-dome-work.svg', 'light', 8],
  ['launch', 'erid-dome-launch.svg', 'dark', 3.2],
  ['ask', 'erid-dome-ask.svg', 'light', 12.8],
  ['amaze', 'erid-dome-amaze.svg', 'dark', 6.6],
];

const only = process.argv.slice(2);
const todo = only.length ? PREVIEWS.filter(([n]) => only.includes(n)) : PREVIEWS;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}
);

for (const [name, file, scheme, secs] of todo) {
  const svg = fs.readFileSync(path.join(ROOT, 'scene', file), 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `erid-${name}-`));
  const page = await browser.newPage({ viewport: { width: W, height: H }, colorScheme: scheme });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;overflow:hidden}svg{display:block;width:100vw;height:100vh}</style>${svg}`
  );
  const frames = Math.round(secs * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate(ms => document.getAnimations().forEach(a => { a.pause(); a.currentTime = ms; }), (i * 1000) / FPS);
    await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
  }
  await page.close();

  const gif = path.join(OUT, `${name}.gif`);
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none',
    '-loop', '0', gif,
  ]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${name}.gif  ${frames} frames  ${(fs.statSync(gif).size / 1024).toFixed(0)} KB`);
}

await browser.close();

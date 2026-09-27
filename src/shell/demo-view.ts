import { TOUCH_BASE, type Demo } from '../demos/demo';
import { VIEW_H, VIEW_W } from '../engine/constants';
import { Input } from '../engine/input';
import { Loop } from '../engine/loop';
import { setupCanvas } from '../engine/renderer';
import type { Scene } from '../engine/scene';
import { scaleFor } from './scale';
import { mountTouchBar } from './touch';

const esc = (s: string): string => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch);

/** Mounts one demo into root: header, canvas, hints, touch bar, loop. Returns the unmount. */
export function mountDemo(root: HTMLElement, demo: Demo): () => void {
  root.innerHTML = `
    <header class="bar">
      <a class="back" href="#/">&larr; Menu</a>
      <h1>${esc(demo.title)}</h1>
      <button class="reset" type="button">Reset (R)</button>
    </header>
    <div class="stage">
      <canvas width="${VIEW_W}" height="${VIEW_H}" aria-label="${esc(demo.title)} demo"></canvas>
      <pre class="overlay" hidden></pre>
    </div>
    <p class="blurb">${esc(demo.blurb)}</p>
    <ul class="hints">${demo.controls.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;

  const canvas = root.querySelector('canvas') as HTMLCanvasElement;
  const stage = root.querySelector('.stage') as HTMLElement;
  const overlay = root.querySelector('.overlay') as HTMLElement;
  const resetButton = root.querySelector('.reset') as HTMLButtonElement;
  const ctx = setupCanvas(canvas);
  const input = new Input();
  const detachKeys = input.attachKeyboard(window);
  const touchButtons = [...TOUCH_BASE, ...(demo.touch ?? [])];
  const unmountTouch = mountTouchBar(stage, input, touchButtons);

  let scene: Scene | null = null;
  let crashed = false;
  const crash = (e: unknown): void => {
    crashed = true;
    overlay.hidden = false;
    overlay.textContent = `${e instanceof Error ? e.message : String(e)}\n\nPress R to reset`;
    console.error(e);
  };
  const reset = (): void => {
    crashed = false;
    overlay.hidden = true;
    try { scene = demo.create(); } catch (e) { scene = null; crash(e); }
  };
  const loop = new Loop(
    () => {
      input.tick();
      if (input.pressed('reset')) reset();
      if (crashed || !scene) return;
      try { scene.update(input); } catch (e) { crash(e); }
    },
    () => {
      if (crashed || !scene) return;
      try { scene.draw(ctx, scene.camera); } catch (e) { crash(e); }
    },
  );

  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') location.hash = '#/'; };
  const onReset = (): void => { reset(); resetButton.blur(); };
  const fit = (): void => {
    const availH = window.innerHeight - stage.getBoundingClientRect().top - 24;
    const k = scaleFor(stage.clientWidth, availH);
    canvas.style.width = `${VIEW_W * k}px`;
    canvas.style.height = `${VIEW_H * k}px`;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', fit);
  resetButton.addEventListener('click', onReset);
  fit();
  reset();
  loop.start();

  return () => {
    loop.stop();
    detachKeys();
    unmountTouch();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', fit);
    resetButton.removeEventListener('click', onReset);
    root.innerHTML = '';
  };
}

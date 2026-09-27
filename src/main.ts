import './shell/styles.css';
import { catalogue, findDemo } from './demos';
import { mountDemo } from './shell/demo-view';
import { renderMenu } from './shell/menu';
import { parseHash } from './shell/router';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');

let unmount: () => void = () => {};

function route(): void {
  unmount();
  unmount = () => {};
  const r = parseHash(location.hash);
  const demo = r.kind === 'demo' ? findDemo(r.id) : undefined;
  if (demo) {
    document.title = `${demo.title} · Mechanics`;
    unmount = mountDemo(root as HTMLElement, demo);
  } else {
    document.title = 'Mechanics';
    renderMenu(root as HTMLElement, catalogue);
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', route);
route();

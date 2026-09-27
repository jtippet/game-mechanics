import { CATEGORIES, type Demo } from '../demos/demo';

export function renderMenu(root: HTMLElement, catalogue: readonly Demo[]): void {
  root.innerHTML = '';
  const header = document.createElement('header');
  header.className = 'bar';
  const h1 = document.createElement('h1');
  h1.textContent = 'Mechanics';
  const p = document.createElement('p');
  p.className = 'tagline';
  p.textContent = 'A sampler of 2D game mechanics. Pick one and play with it.';
  header.append(h1, p);
  root.appendChild(header);

  for (const cat of CATEGORIES) {
    const demos = catalogue.filter(d => d.category === cat);
    if (demos.length === 0) continue;
    const section = document.createElement('section');
    section.className = 'group';
    const h2 = document.createElement('h2');
    h2.textContent = cat;
    section.appendChild(h2);
    const ul = document.createElement('ul');
    ul.className = 'cards';
    for (const d of demos) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `#/${d.id}`;
      const b = document.createElement('b');
      b.textContent = d.title;
      const span = document.createElement('span');
      span.textContent = d.blurb;
      a.append(b, span);
      li.appendChild(a);
      ul.appendChild(li);
    }
    section.appendChild(ul);
    root.appendChild(section);
  }
}

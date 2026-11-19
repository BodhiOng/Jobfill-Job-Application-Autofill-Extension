import { extensionBrowser } from '../shared/browser';
import { loadProfile, sectionLabel } from '../shared/profile';
import type { Profile, ProfileSection } from '../shared/types';

const app = document.querySelector('#app')!;
let profile: Profile;
let query = '';
let activeSection: ProfileSection = 'personal';
let categoryScrollLeft = 0;
let categoryDragging = false;
let sideTabEnabled = true;
const sectionOrder: ProfileSection[] = ['personal', 'contact', 'address', 'education', 'employment', 'experience', 'skills', 'links', 'preferences', 'custom'];
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] ?? c));

function render() {
  const availableSections = sectionOrder.filter((section) => profile.fields.some((field) => field.section === section && field.showInPopup !== false));
  const searchTerm = query.trim().toLowerCase();
  const fields = profile.fields.filter((field) => { const searchable = `${field.label} ${field.value} ${sectionLabel(field.section)} ${(field.aliases ?? []).join(' ')}`.toLowerCase(); return field.showInPopup !== false && (searchTerm ? searchable.includes(searchTerm) : field.section === activeSection); });
  const grouped = fields.reduce<Record<string, typeof fields>>((groups, field) => { (groups[field.section] ??= []).push(field); return groups; }, {});
  app.innerHTML = `<header class="popup-header"><div class="brand"><span class="brand-mark">J</span><div><h1>JobFill</h1><p>Private by default</p></div></div><div class="popup-actions"><button class="icon-button" id="theme" title="Toggle theme">${document.body.classList.contains('dark-mode') ? '☀' : '◐'}</button><button class="icon-button" id="settings" title="Open settings">⚙</button></div></header><section class="hero"><div><p class="eyebrow">YOUR PROFILE</p><h2>Ready when you are.</h2><p class="muted">Click any field to copy its value, then paste it into a form or message.</p></div><span class="status-dot"></span></section><div class="actions"><button class="primary" id="fill">✦ Fill this page</button><button class="secondary" id="overwrite">↻ Overwrite</button>${location.pathname.includes('/dock/') ? '' : '<button class="secondary" id="dock">▣ Dock</button>'}</div><label class="search"><span>⌕</span><input id="search" placeholder="Search your information" value="${esc(query)}"></label><div class="category-bubbles">${availableSections.map((section) => `<button class="category-bubble ${activeSection === section ? 'active' : ''}" data-category="${section}">${sectionLabel(section)}</button>`).join('')}</div><div class="profile-list">${Object.entries(grouped).map(([section, items]) => `<section class="field-group"><div class="group-title">${sectionLabel(section as ProfileSection)}<span>${items.length}</span></div>${items.map((field) => `<button class="field-row ${field.value.trim() ? '' : 'unfilled'}" data-copy="${esc(field.value)}" title="Click to copy"><span><strong>${esc(field.label)}</strong><small>${field.value.trim() ? esc(field.value) : 'Not filled yet'}</small></span></button>`).join('')}</section>`).join('') || '<div class="empty">No fields are enabled for this category.<br>Enable fields in settings if needed.</div>'}</div><footer><span>${profile.fields.filter((field) => field.value.trim()).length} saved values</span><button id="manage">Manage profile →</button></footer>`;
  expandSkillRows(fields);
  document.querySelector('#overwrite')?.remove();
  if (location.pathname.includes('/dock/')) document.querySelector('#settings')?.remove();
  if (location.pathname.includes('/dock/')) {
    const refreshButton = document.createElement('button');
    refreshButton.className = 'secondary';
    refreshButton.id = 'refresh';
    refreshButton.type = 'button';
    refreshButton.textContent = '↻ Refresh';
    document.querySelector('#fill')?.after(refreshButton);
    refreshButton.addEventListener('click', () => void refreshDock());
  }
  const categoryBubbles = document.querySelector<HTMLElement>('.category-bubbles');
  if (categoryBubbles) {
    const strip = document.createElement('div');
    strip.className = 'category-strip';
    const left = document.createElement('button');
    left.className = 'category-arrow'; left.type = 'button'; left.textContent = '‹'; left.title = 'Scroll categories left';
    const right = document.createElement('button');
    right.className = 'category-arrow'; right.type = 'button'; right.textContent = '›'; right.title = 'Scroll categories right';
    categoryBubbles.replaceWith(strip); strip.append(left, categoryBubbles, right);
    left.addEventListener('click', () => categoryBubbles.scrollBy({ left: -150, behavior: 'smooth' }));
    right.addEventListener('click', () => categoryBubbles.scrollBy({ left: 150, behavior: 'smooth' }));
    let startX = 0; let startScroll = 0;
    categoryBubbles.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button')) return;
      categoryDragging = false; startX = event.clientX; startScroll = categoryBubbles.scrollLeft;
      categoryBubbles.setPointerCapture(event.pointerId); categoryBubbles.classList.add('dragging');
    });
    categoryBubbles.addEventListener('pointermove', (event) => {
      if (!categoryBubbles.hasPointerCapture(event.pointerId)) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 4) categoryDragging = true;
      categoryBubbles.scrollLeft = startScroll - distance;
    });
    const stopDrag = (event: PointerEvent) => { if (categoryBubbles.hasPointerCapture(event.pointerId)) categoryBubbles.releasePointerCapture(event.pointerId); categoryBubbles.classList.remove('dragging'); window.setTimeout(() => { categoryDragging = false; }, 0); };
    categoryBubbles.addEventListener('pointerup', stopDrag); categoryBubbles.addEventListener('pointercancel', stopDrag);
  }
  const popupBrand = document.querySelector<HTMLElement>('.brand');
  const popupMark = popupBrand?.querySelector<HTMLElement>('.brand-mark');
  if (popupBrand && popupMark) { const logo = document.createElement('img'); logo.className = 'brand-logo'; logo.src = '../icons/logo.png'; logo.alt = 'JobFill logo'; logo.style.cssText = 'display:block;width:32px;height:32px;border-radius:10px;object-fit:cover'; popupBrand.replaceChild(logo, popupMark); }
  if (!location.pathname.includes('/dock/')) {
    const sideTabButton = document.createElement('button');
    sideTabButton.className = 'icon-button'; sideTabButton.id = 'side-tab-toggle';
    sideTabButton.title = sideTabEnabled ? 'Side tab enabled on new pages' : 'Side tab disabled on new pages';
    sideTabButton.textContent = sideTabEnabled ? '▣' : '□';
    document.querySelector('.popup-actions')?.appendChild(sideTabButton);
    sideTabButton.addEventListener('click', async () => { sideTabEnabled = !sideTabEnabled; await extensionBrowser.storage.local.set({ 'jobfill.sideTabEnabled': sideTabEnabled }); render(); });
  }
  if (location.pathname.includes('/dock/')) {
    const minimizeButton = document.createElement('button'); minimizeButton.className = 'icon-button'; minimizeButton.id = 'dock-minimize'; minimizeButton.title = 'Minimize dock'; minimizeButton.textContent = '—';
    document.querySelector('.popup-actions')?.append(minimizeButton);
    minimizeButton.addEventListener('click', () => void minimizeDock());
  }
  document.querySelector('#search')?.addEventListener('input', (event) => { const input = event.target as HTMLInputElement; const caret = input.selectionStart ?? input.value.length; query = input.value; render(); const nextInput = document.querySelector<HTMLInputElement>('#search'); nextInput?.focus(); nextInput?.setSelectionRange(caret, caret); });
  document.querySelectorAll<HTMLElement>('[data-category]').forEach((button) => button.addEventListener('click', (event) => { if (categoryDragging) { event.preventDefault(); categoryDragging = false; return; } categoryScrollLeft = document.querySelector<HTMLElement>('.category-bubbles')?.scrollLeft ?? 0; activeSection = button.dataset.category as ProfileSection; render(); requestAnimationFrame(() => { const bubbles = document.querySelector<HTMLElement>('.category-bubbles'); if (bubbles) bubbles.scrollLeft = categoryScrollLeft; }); }));
  document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => button.addEventListener('click', async () => { await navigator.clipboard.writeText(button.dataset.copy ?? ''); button.classList.add('copied'); setTimeout(() => button.classList.remove('copied'), 900); }));
  document.querySelector('#settings')?.addEventListener('click', () => location.pathname.includes('/dock/') ? sendDockSettings() : extensionBrowser.runtime.openOptionsPage());
  document.querySelector('#theme')?.addEventListener('click', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('jobfill.theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); render(); });
  document.querySelector('#manage')?.addEventListener('click', () => location.pathname.includes('/dock/') ? sendDockSettings() : extensionBrowser.runtime.openOptionsPage());
  document.querySelector('#fill')?.addEventListener('click', () => location.pathname.includes('/dock/') ? sendDockFill(false) : sendFill(false));
  document.querySelector('#dock')?.addEventListener('click', () => toggleDock());
}

async function refreshDock() {
  const button = document.querySelector<HTMLButtonElement>('#refresh');
  if (button) { button.disabled = true; button.textContent = 'Refreshing…'; }
  profile = await loadProfile();
  render();
}

function splitSkills(value: string): string[] { return value.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean); }
function expandSkillRows(fields: Profile['fields']) {
  const skillFields = fields.filter((field) => field.id === 'skills' || field.label.toLowerCase() === 'technical skills');
  app.querySelectorAll<HTMLElement>('.field-row').forEach((row) => {
    const label = row.querySelector('strong')?.textContent;
    const field = skillFields.find((item) => item.label === label);
    if (!field) return;
    const skills = splitSkills(field.value);
    if (skills.length <= 1) return;
    const fragment = document.createDocumentFragment();
    skills.forEach((skill) => {
      const skillRow = row.cloneNode(true) as HTMLElement;
      skillRow.dataset.copy = skill;
      skillRow.classList.remove('unfilled');
      const strong = skillRow.querySelector('strong');
      if (strong) strong.textContent = skill;
      skillRow.querySelector('small')?.remove();
      fragment.append(skillRow);
    });
    row.replaceWith(fragment);
  });
}

async function sendDockFill(overwrite: boolean) {
  const button = document.querySelector<HTMLButtonElement>('#fill');
  if (button) { button.disabled = true; button.textContent = 'Working…'; }
  const requestId = `jobfill-dock-fill-${Date.now()}-${Math.random()}`;
  try {
    const result = await new Promise<{ filled?: number; detected?: number }>((resolve, reject) => {
      const timer = window.setTimeout(() => { window.removeEventListener('message', onMessage); reject(new Error('Fill timed out')); }, 5000);
      function onMessage(event: MessageEvent) {
        if (event.data?.type !== 'jobfill-dock-fill-result' || event.data.requestId !== requestId) return;
        window.clearTimeout(timer); window.removeEventListener('message', onMessage); resolve(event.data.result ?? {});
      }
      window.addEventListener('message', onMessage);
      window.parent.postMessage({ type: 'jobfill-dock-fill', requestId, overwrite }, '*');
    });
    if (button) button.textContent = result.filled ? `Filled ${result.filled} fields` : result.detected ? 'No matching fields' : 'No typeable fields found';
  } catch { if (button) button.textContent = 'Open a normal web page first'; }
  window.setTimeout(() => { if (button) { button.disabled = false; button.textContent = '✦ Fill this page'; } }, 1800);
}

async function sendDockSettings() {
  if (location.pathname.includes('/dock/')) {
    window.parent.postMessage({ type: 'jobfill-dock-open-settings' }, '*');
    return;
  }
  await extensionBrowser.runtime.openOptionsPage();
}

async function sendFill(overwrite: boolean) { const button = document.querySelector<HTMLButtonElement>(overwrite ? '#overwrite' : '#fill'); if (button) { button.disabled = true; button.textContent = 'Working…'; } try { const tabs = await extensionBrowser.tabs.query({ active: true, currentWindow: true }); const tab = tabs[0]; if (!tab.id) throw new Error('No active tab'); let result; try { result = await extensionBrowser.tabs.sendMessage(tab.id, { type: 'jobfill-fill', overwrite }); } catch { await extensionBrowser.tabs.executeScript(tab.id, { file: 'assets/content.js', allFrames: true }); result = await extensionBrowser.tabs.sendMessage(tab.id, { type: 'jobfill-fill', overwrite }); } if (button) button.textContent = result?.filled ? `Filled ${result.filled} fields` : result?.detected ? 'No matching fields' : 'No typeable fields found'; } catch { if (button) button.textContent = 'Open a normal web page first'; } setTimeout(() => { if (button) { button.disabled = false; button.textContent = overwrite ? '↻ Overwrite' : '✦ Fill this page'; } }, 1800); }
async function toggleDock() { const button = document.querySelector<HTMLButtonElement>('#dock'); if (button) button.disabled = true; try { const tabs = await extensionBrowser.tabs.query({ active: true, currentWindow: true }); const tab = tabs[0]; let result = tab.id ? await extensionBrowser.tabs.sendMessage(tab.id, { type: 'jobfill-toggle-dock' }) : undefined; if (!result && tab.id) { await extensionBrowser.tabs.executeScript(tab.id, { file: 'assets/content-standalone.js' }); result = await extensionBrowser.tabs.sendMessage(tab.id, { type: 'jobfill-toggle-dock' }); } if (button) button.textContent = result?.docked ? '▣ Undock' : '▣ Dock'; } catch { if (button) { button.textContent = 'Open a web page'; button.title = 'Open a normal webpage to use the right-side JobFill dock.'; } } if (button) button.disabled = false; }
async function toggleDockSide() { const tabs = await extensionBrowser.tabs.query({ active: true, currentWindow: true }); const tab = tabs[0]; const stored = await extensionBrowser.storage.local.get('jobfill.dockSide'); const side = stored['jobfill.dockSide'] === 'left' ? 'right' : 'left'; if (tab.id) await extensionBrowser.tabs.sendMessage(tab.id, { type: 'jobfill-set-dock-side', side }); const button = document.querySelector<HTMLButtonElement>('#dock-side'); if (button) button.textContent = side === 'left' ? '⇤ Left' : '⇥ Right'; }
async function sendDockCommand(type: 'jobfill-minimize-dock' | 'jobfill-close-dock') {
  if (location.pathname.includes('/dock/')) { window.parent.postMessage({ type }, '*'); await extensionBrowser.runtime.sendMessage({ type }); return; }
  const tabs = await extensionBrowser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab.id) await extensionBrowser.tabs.sendMessage(tab.id, { type });
}
async function minimizeDock() { await sendDockCommand('jobfill-minimize-dock'); }
async function closeDock() { await sendDockCommand('jobfill-close-dock'); }

if (localStorage.getItem('jobfill.theme') !== 'light') document.body.classList.add('dark-mode');
void (async () => { const stored = await extensionBrowser.storage.local.get('jobfill.sideTabEnabled'); sideTabEnabled = stored['jobfill.sideTabEnabled'] !== false; profile = await loadProfile(); const firstSection = sectionOrder.find((section) => profile.fields.some((field) => field.section === section && field.showInPopup !== false)); if (firstSection) activeSection = firstSection; render(); })();

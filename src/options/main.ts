import { exportProfile, importProfile, loadProfile, makeField, saveProfile, sectionLabel } from '../shared/profile';
import type { Profile, ProfileField, ProfileSection } from '../shared/types';

const app = document.querySelector('#app')!;
let profile: Profile = { version: 1, fields: [], mappings: {}, updatedAt: new Date().toISOString() };
let activeSection: ProfileSection = 'personal';
let searchOpen = false;
let searchQuery = '';
let highlightedFieldId: string | undefined;
const sections: ProfileSection[] = ['personal', 'contact', 'address', 'education', 'experience', 'skills', 'links', 'preferences', 'custom'];
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] ?? c));

function render() {
  const matches = searchQuery.trim() ? profile.fields.filter((field) => `${field.label} ${(field.aliases ?? []).join(' ')}`.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())).slice(0, 8) : [];
  const searchPanel = searchOpen ? `<div class="settings-search"><input id="settings-search" type="search" value="${esc(searchQuery)}" placeholder="Search fields or aliases" aria-label="Search fields or aliases">${searchQuery.trim() ? `<div class="settings-search-results">${matches.map((field) => `<button class="settings-search-result" data-jump-field="${esc(field.id)}"><strong>${esc(field.label)}</strong><small>${esc(sectionLabel(field.section))}</small></button>`).join('') || '<p class="settings-search-empty">No matching fields.</p>'}</div>` : ''}</div>` : '';
  profile.fields.filter((field) => field.section === 'experience').forEach((field) => { if (field.id.endsWith('-start')) field.label = field.label.replace(/Start month(?: \/ year)?$/, 'Start date'); if (field.id.endsWith('-end')) field.label = field.label.replace(/End month(?: \/ year)?$/, 'End date'); });
  const visible = profile.fields.filter((field) => field.section === activeSection);
  const content = activeSection === 'experience' ? experienceBlocks(visible) : `<div class="table-head"><span>FIELD</span><span>VALUE</span><span>ALIASES</span><span></span></div>${visible.map(row).join('') || '<div class="empty">No fields here yet. Add a reusable field to get started.</div>'}`;
  app.innerHTML = `<div class="settings-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">J</span><div><h1>JobFill</h1><p>Profile settings</p></div></div><nav>${sections.map((section) => `<button class="nav-item ${activeSection === section ? 'active' : ''}" data-section="${section}">◦ <span>${sectionLabel(section)}</span><em>${profile.fields.filter((field) => field.section === section).length}</em></button>`).join('')}</nav><input id="file" type="file" accept="application/json" hidden></aside><section class="settings-main"><header class="settings-top"><div><p class="eyebrow">PROFILE BUILDER</p><h2>${sectionLabel(activeSection)}</h2><p class="muted">Everything stays in this browser. Add only what you want JobFill to use.</p></div><div class="top-actions"><button class="toolbar-button" id="theme">${document.body.classList.contains('dark-mode') ? '☀ Light' : '◐ Dark'}</button><details class="backup-menu"><summary class="toolbar-button">↕ Backup</summary><div class="backup-popover"><button id="export">↓ Export backup</button><button id="import">↑ Import backup</button></div></details>${activeSection === 'experience' ? '<button class="primary" id="add-experience">+ Add experience</button>' : '<button class="primary" id="add">+ Add field</button>'}</div></header><div class="privacy-note"><span>⌁</span><div><strong>Local and private</strong><p>Everything is stored only in browser storage.</p></div></div><div class="fields-table ${activeSection === 'experience' ? 'experience-list' : ''}">${content}</div></section></div>`;
  app.querySelectorAll<HTMLInputElement>('input[type="month"]').forEach((input) => { input.placeholder = 'MM/YYYY'; });

  const sidebar = app.querySelector<HTMLElement>('.sidebar');
  const nav = sidebar?.querySelector('nav');
  const searchButton = document.createElement('button');
  searchButton.className = 'settings-search-toggle';
  searchButton.id = 'toggle-search';
  searchButton.setAttribute('aria-expanded', String(searchOpen));
  searchButton.textContent = '⌕ Search fields';
  sidebar?.querySelector('.brand')?.after(searchButton);
  if (searchOpen) {
    const panel = document.createElement('div');
    panel.className = 'settings-search';
    panel.innerHTML = `<input id="settings-search" type="search" value="${esc(searchQuery)}" placeholder="Search fields or aliases" aria-label="Search fields or aliases">${searchQuery.trim() ? `<div class="settings-search-results">${matches.map((field) => `<button class="settings-search-result" data-jump-field="${esc(field.id)}"><strong>${esc(field.label)}</strong><small>${esc(sectionLabel(field.section))}</small></button>`).join('') || '<p class="settings-search-empty">No matching fields.</p>'}</div>` : ''}`;
    sidebar?.querySelector('.settings-search-toggle')?.after(panel);
  }
  app.querySelectorAll<HTMLElement>('.field-card').forEach((card) => {
    const fieldId = card.querySelector<HTMLElement>('[data-field-id]')?.dataset.fieldId;
    if (fieldId) {
      card.dataset.fieldCard = fieldId;
      if (fieldId === highlightedFieldId) card.classList.add('search-highlight');
    }
  });
  app.querySelector('#toggle-search')?.remove();
  app.querySelector('.sidebar .settings-search')?.remove();
  const settingsMain = app.querySelector<HTMLElement>('.settings-main');
  if (settingsMain) {
    const searchShell = document.createElement('div');
    searchShell.className = 'settings-global-search';
    searchShell.innerHTML = `<input id="settings-search" type="search" value="${esc(searchQuery)}" placeholder="Search fields or aliases" aria-label="Search fields or aliases">${searchQuery.trim() ? `<div class="settings-search-results">${matches.map((field) => `<button class="settings-search-result" data-jump-field="${esc(field.id)}"><strong>${esc(field.label)}</strong><small>${esc(sectionLabel(field.section))}</small></button>`).join('') || '<p class="settings-search-empty">No matching fields.</p>'}</div>` : ''}`;
    settingsMain.prepend(searchShell);
  }
  if (activeSection === 'skills') {
    const hint = document.createElement('p');
    hint.className = 'skills-hint';
    hint.textContent = 'Separate each skill with a comma, for example: TypeScript, React, SQL.';
    app.querySelector('.fields-table')?.before(hint);
  }
  app.querySelector('#toggle-search')?.addEventListener('click', () => { searchOpen = !searchOpen; render(); app.querySelector<HTMLInputElement>('#settings-search')?.focus(); });
  app.querySelector<HTMLInputElement>('#settings-search')?.addEventListener('input', (event) => { searchQuery = (event.target as HTMLInputElement).value; render(); const input = app.querySelector<HTMLInputElement>('#settings-search'); input?.focus(); input?.setSelectionRange(searchQuery.length, searchQuery.length); });
  app.querySelectorAll<HTMLButtonElement>('[data-jump-field]').forEach((button) => button.addEventListener('click', () => { const field = profile.fields.find((item) => item.id === button.dataset.jumpField); if (!field) return; activeSection = field.section; highlightedFieldId = field.id; searchOpen = false; searchQuery = ''; render(); window.setTimeout(() => { const target = app.querySelector<HTMLElement>(`[data-field-card="${CSS.escape(field.id)}"]`); target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.classList.add('search-highlight'); window.setTimeout(() => target?.classList.remove('search-highlight'), 1800); }, 0); }));
  app.querySelector('.settings-top .muted')?.remove();
  app.querySelector('.privacy-note')?.remove();
  const optionsBrand = document.querySelector<HTMLElement>('.sidebar .brand');
  const optionsMark = optionsBrand?.querySelector<HTMLElement>('.brand-mark');
  if (optionsBrand && optionsMark) { const logo = document.createElement('img'); logo.className = 'brand-logo'; logo.src = '../icons/logo.png'; logo.alt = 'JobFill logo'; logo.style.cssText = 'display:block;width:32px;height:32px;border-radius:10px;object-fit:cover'; optionsBrand.replaceChild(logo, optionsMark); }
  app.querySelectorAll<HTMLElement>('[data-section]').forEach((button) => { button.addEventListener('click', () => { activeSection = button.dataset.section as ProfileSection; render(); }); button.addEventListener('dragover', (event) => { event.preventDefault(); button.classList.add('drag-over'); }); button.addEventListener('dragleave', () => button.classList.remove('drag-over')); button.addEventListener('drop', (event) => { event.preventDefault(); button.classList.remove('drag-over'); const field = getDraggedField(event); const section = button.dataset.section as ProfileSection; if (field && field.section !== 'experience') { field.section = section; persist(); } }); });
  app.querySelectorAll<HTMLElement>('[data-section="experience"]').forEach((button) => button.addEventListener('drop', (event) => { event.preventDefault(); event.stopImmediatePropagation(); button.classList.remove('drag-over'); const field = getDraggedField(event); if (field && !field.base) { field.section = 'experience'; persist(); } }, true));
  app.querySelectorAll<HTMLElement>('[data-drag-field]').forEach((item) => { item.addEventListener('dragstart', (event) => { (event as DragEvent).dataTransfer?.setData('text/plain', item.dataset.dragField ?? ''); item.classList.add('dragging'); }); item.addEventListener('dragend', () => item.classList.remove('dragging')); item.addEventListener('dragover', (event) => { event.preventDefault(); item.classList.add('drag-over'); }); item.addEventListener('dragleave', () => item.classList.remove('drag-over')); item.addEventListener('drop', (event) => { event.preventDefault(); item.classList.remove('drag-over'); reorderField(getDraggedField(event), item.dataset.dragField ?? ''); }); });
  app.querySelector('#add')?.addEventListener('click', () => { profile.fields.push(makeField({ section: activeSection })); persist(); });
  app.querySelector('#add-experience')?.addEventListener('click', () => { addExperience(); persist(); });
  app.querySelector('#theme')?.addEventListener('click', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('jobfill.theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); render(); });
  app.querySelector('#export')?.addEventListener('click', async () => { const blob = new Blob([await exportProfile()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `jobfill-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); });
  app.querySelector('#import')?.addEventListener('click', () => app.querySelector<HTMLInputElement>('#file')?.click());
  app.querySelector('#file')?.addEventListener('change', async (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { profile = await importProfile(await file.text()); render(); } catch (error) { alert(error instanceof Error ? error.message : 'Could not import backup.'); } });
  app.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field-id]').forEach((input) => input.addEventListener('change', () => { const field = profile.fields.find((item) => item.id === input.dataset.fieldId); if (!field) return; const key = input.dataset.key as keyof ProfileField; if (key === 'aliases') field.aliases = input.value.split(',').map((value) => value.trim()).filter(Boolean); else if (key === 'showInPopup') field.showInPopup = (input as HTMLInputElement).checked; else if (key === 'label' || key === 'value') field[key] = input.value; persist(false); }));
  app.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((button) => button.addEventListener('click', () => { const field = profile.fields.find((item) => item.id === button.dataset.delete); if (field?.base) return; profile.fields = profile.fields.filter((item) => item.id !== button.dataset.delete); persist(); }));
  app.querySelectorAll<HTMLButtonElement>('[data-delete-experience]').forEach((button) => button.addEventListener('click', () => { const number = button.dataset.deleteExperience; if (number === 'other') profile.fields = profile.fields.filter((field) => !(field.section === 'experience' && !/^experience-\d+-/.test(field.id))); else profile.fields = profile.fields.filter((field) => !field.id.startsWith(`experience-${number}-`)); persist(); }));
}

function getDraggedField(event: Event): ProfileField | undefined { const id = (event as DragEvent).dataTransfer?.getData('text/plain'); return profile.fields.find((field) => field.id === id); }
function reorderField(source: ProfileField | undefined, targetId: string) { if (!source || source.section === 'experience' || source.id === targetId) return; const targetIndex = profile.fields.findIndex((field) => field.id === targetId); const sourceIndex = profile.fields.findIndex((field) => field.id === source.id); if (targetIndex < 0 || sourceIndex < 0 || profile.fields[targetIndex].section !== source.section) return; profile.fields.splice(sourceIndex, 1); profile.fields.splice(profile.fields.findIndex((field) => field.id === targetId), 0, source); persist(); }

function addExperience() { const number = Math.max(0, ...profile.fields.map((field) => Number(field.id.match(/^experience-(\d+)-/)?.[1] ?? 0))) + 1; const common = { section: 'experience' as const }; profile.fields.push(makeField({ ...common, id: `experience-${number}-company`, label: `Experience ${number} — Company`, aliases: ['company', 'employer', 'perusahaan'] }), makeField({ ...common, id: `experience-${number}-job-title`, label: `Experience ${number} — Job title`, aliases: ['position', 'role', 'jabatan', 'posisi'] }), makeField({ ...common, id: `experience-${number}-start`, label: `Experience ${number} — Start month`, type: 'month', aliases: ['start date', 'mulai bekerja', 'tanggal mulai'] }), makeField({ ...common, id: `experience-${number}-end`, label: `Experience ${number} — End month`, type: 'month', aliases: ['end date', 'tanggal selesai'] }), makeField({ ...common, id: `experience-${number}-description`, label: `Experience ${number} — Description`, type: 'textarea', aliases: ['responsibilities', 'deskripsi pekerjaan'] }), makeField({ ...common, id: `experience-${number}-type`, label: `Experience ${number} — Work type`, type: 'select', options: ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract', 'Volunteer'], aliases: ['employment type', 'jenis pekerjaan'] })); }
function experienceBlocks(fields: ProfileField[]) { const groups = new Map<string, ProfileField[]>(); fields.forEach((field) => { const number = field.id.match(/^experience-(\d+)-/)?.[1] ?? 'other'; (groups.get(number) ?? groups.set(number, []).get(number)!).push(field); }); return [...groups.entries()].sort(([a], [b]) => a === 'other' ? 1 : b === 'other' ? -1 : Number(a) - Number(b)).map(([number, items]) => `<section class="experience-block"><header><div><span class="eyebrow">WORK HISTORY</span><h3>${number === 'other' ? 'Additional fields' : `Experience ${esc(number)}`}</h3></div><div class="experience-heading-actions"><span class="experience-count">${items.length} fields</span><button class="delete-experience" data-delete-experience="${esc(number)}">Delete experience</button></div></header>${items.map(row).join('')}</section>`).join('') || '<div class="empty">No work experience yet. Add an experience to get started.</div>'; }
function valueControl(field: ProfileField) { if (field.type === 'textarea') return `<textarea data-field-id="${field.id}" data-key="value" placeholder="Value">${esc(field.value)}</textarea>`; if (field.type === 'select') return `<select data-field-id="${field.id}" data-key="value"><option value="">Select…</option>${(field.options ?? []).map((option) => `<option value="${esc(option)}" ${field.value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`; return `<input data-field-id="${field.id}" data-key="value" type="${field.type === 'month' ? 'month' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'}" value="${esc(field.value)}" placeholder="Value">`; }
function row(field: ProfileField) { const draggable = !field.base && field.section !== 'experience'; const deleteControl = field.base ? '<span class="protected-field" title="Base field">🔒</span>' : `<button class="delete" data-delete="${field.id}">×</button>`; return `<div class="field-card ${draggable ? '' : 'experience-field'}" ${draggable ? `draggable="true" data-drag-field="${field.id}"` : ''}><div class="field-main">${draggable ? '<span class="drag-handle" title="Drag to reorder or move">⠿</span>' : ''}<input data-field-id="${field.id}" data-key="label" value="${esc(field.label)}" aria-label="Field label"><label class="visibility-toggle" title="Show this field in the popup"><input data-field-id="${field.id}" data-key="showInPopup" type="checkbox" ${field.showInPopup !== false ? 'checked' : ''}> popup</label></div>${valueControl(field)}<input data-field-id="${field.id}" data-key="aliases" value="${esc((field.aliases ?? []).join(', '))}" placeholder="name, alias, label">${deleteControl}</div>`; }
async function persist(renderAgain = true) { await saveProfile(profile); if (renderAgain) render(); }
if (localStorage.getItem('jobfill.theme') !== 'light') document.body.classList.add('dark-mode');
void (async () => { profile = await loadProfile(); render(); })();

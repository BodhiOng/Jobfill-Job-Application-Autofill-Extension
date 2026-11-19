import { extensionBrowser } from '../shared/browser';
import { bestMatch } from '../shared/matching';
import { fillCandidate, formCandidates } from '../shared/dom';
import { loadProfile } from '../shared/profile';
import type { FillCandidate, Profile } from '../shared/types';

let candidates: FillCandidate[] = [];
let highlightTimer: number | undefined;
let dock: HTMLElement | undefined;
let launcher: HTMLElement | undefined;
let dockFrame: HTMLIFrameElement | undefined;
let dockSide: 'left' | 'right' = 'right';
let originalPageSpacing: { marginLeft: string; marginRight: string; width: string; bodyMarginLeft: string; bodyMarginRight: string; bodyWidth: string } | undefined;
let dockResizeObserver: ResizeObserver | undefined;
let sideTabEnabled = true;
const refresh = () => { candidates = formCandidates(); };
function ensureDockLayoutStyle() { if (document.getElementById('jobfill-dock-layout-style')) return; const style = document.createElement('style'); style.id = 'jobfill-dock-layout-style'; style.textContent = 'html[data-jobfill-docked="true"]{width:calc(100vw - var(--jobfill-dock-width))!important;min-width:0!important;overflow-x:hidden!important}html[data-jobfill-docked="true"] body{width:calc(100vw - var(--jobfill-dock-width))!important;max-width:none!important;min-width:0!important;overflow-x:hidden!important}'; (document.head || document.documentElement).appendChild(style); }
const highlight = (elements: Element[]) => { elements.forEach((element) => { (element as HTMLElement).style.outline = '2px solid #7c3aed'; }); window.clearTimeout(highlightTimer); highlightTimer = window.setTimeout(() => elements.forEach((element) => { (element as HTMLElement).style.outline = ''; }), 1800); };

type FillSummary = { filled: number; detected: number };

type FillAuditRow = {
  element: string;
  type: string;
  name: string;
  id: string;
  placeholder: string;
  readValue: string;
  matchedField: string;
  savedValue: string;
  score: number;
  reason: string;
  action: 'filled' | 'skipped-existing' | 'skipped-no-match';
};

function logDomScan(profile: Profile, scannedCandidates: FillCandidate[]): void {
  const rows = scannedCandidates.map((candidate) => {
    const element = candidate.element;
    const input = element instanceof HTMLInputElement ? element : undefined;
    const match = bestMatch(element, profile);
    return {
      element: element.tagName.toLowerCase(),
      type: input?.type ?? element.tagName.toLowerCase(),
      name: element.getAttribute('name') ?? '',
      id: element.id,
      placeholder: element.getAttribute('placeholder') ?? '',
      autocomplete: element.getAttribute('autocomplete') ?? '',
      ariaLabel: element.getAttribute('aria-label') ?? '',
      matchedField: match?.field.label ?? '',
      score: match?.score ?? 0,
      reason: match?.reason ?? 'no match'
    };
  });

  console.groupCollapsed(`[JobFill] DOM scan: ${rows.length} typeable fields`);
  console.table(rows);
  console.info('Only fields with a deterministic match are eligible for filling. Existing values are preserved unless overwrite is requested.');
  console.groupEnd();
}

function fillChildFrames(overwrite: boolean): Promise<FillSummary> {
  const frames = Array.from(document.querySelectorAll('iframe, frame'));
  if (!frames.length) return Promise.resolve({ filled: 0, detected: 0 });

  return new Promise((resolve) => {
    const requestId = `jobfill-frame-${Date.now()}-${Math.random()}`;
    let completed = 0;
    let filled = 0;
    let detected = 0;
    let finished = false;
    const timer = window.setTimeout(finish, 450);

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve({ filled, detected });
    }

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type !== 'jobfill-fill-frame-result' || data.requestId !== requestId) return;
      completed += 1;
      filled += Number(data.result?.filled ?? 0);
      detected += Number(data.result?.detected ?? 0);
      if (completed >= frames.length) finish();
    }

    window.addEventListener('message', onMessage);
    for (const frame of frames) {
      const target = (frame as HTMLIFrameElement | HTMLFrameElement).contentWindow;
      if (!target) completed += 1;
      else target.postMessage({ type: 'jobfill-fill-frame', requestId, overwrite }, '*');
    }
    if (completed >= frames.length) finish();
  });
}

async function fillPage(overwrite: boolean, includeFrames = true): Promise<FillSummary> {
  refresh();
  const profile = await loadProfile();
  logDomScan(profile, candidates);

  const filled: Element[] = [];
  const audit: FillAuditRow[] = [];

  for (const candidate of candidates) {
    const element = candidate.element;
    const input = element instanceof HTMLInputElement ? element : undefined;
    const match = bestMatch(element, profile);
    const readValue = element.value;
    const base = {
      element: element.tagName.toLowerCase(),
      type: input?.type ?? element.tagName.toLowerCase(),
      name: element.getAttribute('name') ?? '',
      id: element.id,
      placeholder: element.getAttribute('placeholder') ?? '',
      readValue,
      matchedField: match?.field.label ?? '',
      savedValue: match?.field.value ?? '',
      score: match?.score ?? 0,
      reason: match?.reason ?? 'no match'
    };

    if (!match) {
      audit.push({ ...base, action: 'skipped-no-match' });
      continue;
    }

    if (!overwrite && readValue.trim()) {
      audit.push({ ...base, action: 'skipped-existing' });
      continue;
    }

    fillCandidate(candidate, match.field.value);
    filled.push(element);
    audit.push({ ...base, action: 'filled' });
  }

  console.groupCollapsed(`[JobFill] Autofill audit: ${filled.length} filled, ${audit.length - filled.length} skipped`);
  console.table(audit);
  console.info(`Mode: ${overwrite ? 'overwrite existing values' : 'preserve existing values'}`);
  console.info('Actions: filled = value applied; skipped-existing = existing value preserved; skipped-no-match = no deterministic profile match.');
  console.groupEnd();

  highlight(filled);
  const childResult = includeFrames ? await fillChildFrames(overwrite) : { filled: 0, detected: 0 };
  return { filled: filled.length + childResult.filled, detected: candidates.length + childResult.detected };
}

function renderDock(profile: Profile) {
  if (!dock) return;
  const shadow = dock.shadowRoot!;
  const fields = profile.fields.filter((field) => field.showInPopup !== false && field.value.trim());
  shadow.innerHTML = `<style>:host{all:initial}*{box-sizing:border-box;font-family:Inter,system-ui,sans-serif}aside{position:fixed;z-index:2147483647;top:16px;right:16px;width:350px;max-height:calc(100vh - 32px);overflow:auto;border:1px solid #3f3b55;border-radius:16px;background:#171820;color:#f5f5f7;box-shadow:0 18px 60px #0008}header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #343642}h2{margin:0;font-size:16px}p{margin:3px 0 0;color:#a9adba;font-size:11px}.close{border:0;background:#2b2e38;color:#fff;border-radius:7px;padding:5px 9px;font-size:16px;cursor:pointer}.actions{display:flex;gap:7px;padding:13px 18px}.actions button{flex:1;border:0;border-radius:8px;padding:9px;background:#7058dd;color:#fff;font-weight:700;cursor:pointer}.actions .muted{background:#2b2e38}.list{padding:0 12px 14px}.group{margin:10px 0}.group-title{padding:6px;color:#aaa4db;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.field{display:flex;width:100%;justify-content:space-between;gap:12px;padding:10px;border:0;border-radius:8px;background:transparent;color:#f4f4f6;text-align:left;cursor:pointer}.field:hover{background:#292c37}.field small{display:block;margin-top:2px;color:#aeb3c0;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.empty{text-align:center;padding:26px 10px;color:#aeb3c0;font-size:12px}</style><aside><header><div><h2>JobFill</h2><p>Docked profile</p></div><button class="close" id="close">×</button></header><div class="actions"><button id="fill">✦ Fill this page</button><button class="muted" id="overwrite">↻ Overwrite</button></div><div class="list">${Object.entries(fields.reduce<Record<string, typeof fields>>((groups, field) => { (groups[field.section] ??= []).push(field); return groups; }, {})).map(([section, items]) => `<section class="group"><div class="group-title">${section}</div>${items.map((field) => `<button class="field" data-value="${field.value.replace(/"/g, '&quot;')}"><span>${field.label}<small>${field.value}</small></span></button>`).join('')}</section>`).join('') || '<div class="empty">Add profile values in JobFill settings.</div>'}</div></aside>`;
  shadow.querySelector('#close')?.addEventListener('click', () => { dock?.remove(); dock = undefined; });
  shadow.querySelector('#overwrite')?.remove();
  shadow.querySelector('#fill')?.addEventListener('click', async () => { const button = shadow.querySelector<HTMLButtonElement>('#fill'); if (button) button.textContent = 'Working…'; const result = await fillPage(false); if (button) button.textContent = `Filled ${result.filled}`; });
  shadow.querySelectorAll<HTMLElement>('[data-value]').forEach((button) => button.addEventListener('click', () => navigator.clipboard.writeText(button.dataset.value ?? '')));
}

function applyDockLayout() { if (!dockFrame) return; const width = dockFrame.getBoundingClientRect().width; ensureDockLayoutStyle(); document.documentElement.dataset.jobfillDocked = 'true'; document.documentElement.style.setProperty('--jobfill-dock-width', `${width}px`); if (!originalPageSpacing) originalPageSpacing = { marginLeft: document.documentElement.style.marginLeft, marginRight: document.documentElement.style.marginRight, width: document.documentElement.style.width, bodyMarginLeft: document.body?.style.marginLeft ?? '', bodyMarginRight: document.body?.style.marginRight ?? '', bodyWidth: document.body?.style.width ?? '' }; document.documentElement.style.width = `calc(100% - ${width}px)`; document.documentElement.style.marginLeft = dockSide === 'left' ? `${width}px` : originalPageSpacing.marginLeft; document.documentElement.style.marginRight = originalPageSpacing.marginRight; if (document.body) { document.body.style.marginLeft = originalPageSpacing.bodyMarginLeft; document.body.style.marginRight = originalPageSpacing.bodyMarginRight; document.body.style.width = '100%'; } dockFrame.style.left = dockSide === 'left' ? '0' : 'auto'; dockFrame.style.right = dockSide === 'right' ? '0' : 'auto'; }
async function toggleDock() { if (dockFrame) { if (dockFrame.style.display === 'none') { dockFrame.style.display = ''; applyDockLayout(); return true; } dockFrame.remove(); dockFrame = undefined; dockResizeObserver?.disconnect(); dockResizeObserver = undefined; document.documentElement.dataset.jobfillDocked = 'false'; document.documentElement.style.removeProperty('--jobfill-dock-width'); if (originalPageSpacing) { document.documentElement.style.width = originalPageSpacing.width; document.documentElement.style.marginLeft = originalPageSpacing.marginLeft; document.documentElement.style.marginRight = originalPageSpacing.marginRight; if (document.body) { document.body.style.marginLeft = originalPageSpacing.bodyMarginLeft; document.body.style.marginRight = originalPageSpacing.bodyMarginRight; document.body.style.width = originalPageSpacing.bodyWidth; } originalPageSpacing = undefined; } return false; } const stored = await extensionBrowser.storage.local.get('jobfill.dockSide'); dockSide = stored['jobfill.dockSide'] === 'left' ? 'left' : 'right'; dockFrame = document.createElement('iframe'); dockFrame.title = 'JobFill dock'; dockFrame.src = extensionBrowser.runtime.getURL('dock/index.html'); Object.assign(dockFrame.style, { position: 'fixed', top: '0', width: '380px', minWidth: '300px', maxWidth: '55vw', height: '100vh', zIndex: '2147483647', border: '0', borderRadius: '0', background: '#171820', boxShadow: '-8px 0 24px #0005', resize: 'horizontal', overflow: 'auto' }); document.documentElement.appendChild(dockFrame); dockResizeObserver = new ResizeObserver(() => applyDockLayout()); dockResizeObserver.observe(dockFrame); applyDockLayout(); return true; }
function minimizeDock() { if (!dockFrame) return { minimized: false }; dockFrame.style.display = 'none'; document.documentElement.dataset.jobfillDocked = 'false'; document.documentElement.style.removeProperty('--jobfill-dock-width'); if (originalPageSpacing) { document.documentElement.style.width = originalPageSpacing.width; document.documentElement.style.marginLeft = originalPageSpacing.marginLeft; document.documentElement.style.marginRight = originalPageSpacing.marginRight; if (document.body) { document.body.style.marginLeft = originalPageSpacing.bodyMarginLeft; document.body.style.marginRight = originalPageSpacing.bodyMarginRight; document.body.style.width = originalPageSpacing.bodyWidth; } } removeLauncher(); ensureLauncher(); return { minimized: true }; }
function closeDock() { if (!dockFrame) return { closed: false }; dockFrame.remove(); dockFrame = undefined; dockResizeObserver?.disconnect(); dockResizeObserver = undefined; document.documentElement.dataset.jobfillDocked = 'false'; document.documentElement.style.removeProperty('--jobfill-dock-width'); if (originalPageSpacing) { document.documentElement.style.width = originalPageSpacing.width; document.documentElement.style.marginLeft = originalPageSpacing.marginLeft; document.documentElement.style.marginRight = originalPageSpacing.marginRight; if (document.body) { document.body.style.marginLeft = originalPageSpacing.bodyMarginLeft; document.body.style.marginRight = originalPageSpacing.bodyMarginRight; document.body.style.width = originalPageSpacing.bodyWidth; } originalPageSpacing = undefined; } launcher?.remove(); launcher = undefined; return { closed: true }; }
async function setDockSide(side: 'left' | 'right') { dockSide = side; await extensionBrowser.storage.local.set({ 'jobfill.dockSide': side }); applyDockLayout(); return { side }; }

function removeLauncher() { launcher?.remove(); launcher = undefined; }
function ensureLauncher() {
  if (!sideTabEnabled || launcher || !document.documentElement) return;
  launcher = document.createElement('div');
  launcher.id = 'jobfill-launcher';
  launcher.setAttribute('style', 'display:block!important;visibility:visible!important;position:static!important;width:0!important;height:0!important;padding:0!important;margin:0!important;opacity:1!important;');
  document.documentElement.appendChild(launcher);
  const launcherButton = document.createElement('button');
  launcherButton.type = 'button';
  launcherButton.title = 'Open JobFill';
  launcherButton.textContent = 'JOBFILL';
  launcherButton.setAttribute('style', 'all:initial!important;position:fixed!important;z-index:2147483646!important;top:42%!important;right:0!important;width:34px!important;height:88px!important;border:1px solid #8d78ed!important;border-right:0!important;border-radius:12px 0 0 12px!important;background:#7058dd!important;color:#fff!important;box-shadow:0 8px 24px #241a5c66!important;font:800 12px system-ui,sans-serif!important;cursor:pointer!important;writing-mode:vertical-rl!important;letter-spacing:.08em!important;display:grid!important;place-items:center!important;visibility:visible!important;opacity:1!important;');
  launcher.appendChild(launcherButton);
  launcherButton?.addEventListener('click', () => { void toggleDock(); });
}

extensionBrowser.runtime.onMessage.addListener(async (message: { type?: string; overwrite?: boolean; side?: 'left' | 'right' }) => { if (message.type === 'jobfill-fill') return fillPage(Boolean(message.overwrite)); if (message.type === 'jobfill-toggle-dock') return { docked: await toggleDock() }; if (message.type === 'jobfill-minimize-dock') return minimizeDock(); if (message.type === 'jobfill-set-dock-side' && message.side) return setDockSide(message.side); return undefined; });
window.addEventListener('message', (event) => { if (window.top !== window || event.data?.type !== 'jobfill-dock-fill') return; const source = event.source as WindowProxy | null; if (!source) return; void fillPage(Boolean(event.data.overwrite)).then((result) => source.postMessage({ type: 'jobfill-dock-fill-result', requestId: event.data.requestId, result }, '*')); });
window.addEventListener('message', (event) => { if (event.data?.type === 'jobfill-fill-frame' && event.source === window.parent && window.parent !== window) { void fillPage(Boolean(event.data.overwrite), false).then((result) => window.parent.postMessage({ type: 'jobfill-fill-frame-result', requestId: event.data.requestId, result }, '*')); return; } if (window.top !== window) return; if (event.data?.type === 'jobfill-minimize-dock') minimizeDock(); if (event.data?.type === 'jobfill-close-dock') closeDock(); if (event.data?.type === 'jobfill-dock-open-settings') void extensionBrowser.runtime.sendMessage({ type: 'open-options' }); });
extensionBrowser.storage.onChanged.addListener((changes, area) => { if (window.top !== window || area !== 'local' || changes['jobfill.sideTabEnabled'] === undefined) return; sideTabEnabled = changes['jobfill.sideTabEnabled'].newValue !== false; if (sideTabEnabled) ensureLauncher(); else removeLauncher(); });
refresh();
if (window.top === window) void extensionBrowser.storage.local.get('jobfill.sideTabEnabled').then((stored) => { sideTabEnabled = stored['jobfill.sideTabEnabled'] !== false; if (sideTabEnabled) ensureLauncher(); });

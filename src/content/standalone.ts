type ExtensionApi = typeof browser;
const api = ((globalThis as typeof globalThis & { browser?: ExtensionApi; chrome?: ExtensionApi }).browser ?? (globalThis as typeof globalThis & { chrome?: ExtensionApi }).chrome) as ExtensionApi;
const FLAG = '__jobfillStandaloneLoaded';

if (!(window as Window & { [FLAG]?: boolean })[FLAG]) {
  (window as Window & { [FLAG]?: boolean })[FLAG] = true;
  let dock: HTMLElement | undefined;
  const load = async () => { const result = await api.storage.local.get('jobfill.profile'); return result['jobfill.profile'] as { fields?: Array<{ section: string; label: string; value: string; showInPopup?: boolean }> } | undefined; };
  const toggle = async () => {
    if (dock) { dock.remove(); dock = undefined; return { docked: false }; }
    const saved = await load();
    const fields = (saved?.fields ?? []).filter((field) => field.showInPopup !== false && field.value.trim());
    dock = document.createElement('jobfill-dock'); document.documentElement.appendChild(dock);
    const shadow = dock.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>:host{all:initial}*{box-sizing:border-box;font-family:system-ui,sans-serif}aside{position:fixed;z-index:2147483647;top:16px;right:16px;width:350px;max-height:calc(100vh - 32px);overflow:auto;border:1px solid #3f3b55;border-radius:16px;background:#171820;color:#f5f5f7;box-shadow:0 18px 60px #0008}header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #343642}h2{margin:0;font-size:16px}p{margin:3px 0 0;color:#a9adba;font-size:11px}.close{border:0;border-radius:7px;background:#2b2e38;color:#fff;padding:5px 9px;font-size:16px}.list{padding:12px}.group{margin:8px 0}.group-title{padding:6px;color:#aaa4db;font-size:10px;font-weight:800;text-transform:uppercase}.field{display:block;width:100%;padding:10px;border:0;border-radius:8px;background:transparent;color:#f4f4f6;text-align:left}.field:hover{background:#292c37}.field small{display:block;margin-top:3px;color:#aeb3c0;font-size:11px}.empty{text-align:center;padding:25px 10px;color:#aeb3c0;font-size:12px}</style><aside><header><div><h2>JobFill</h2><p>Docked profile</p></div><button class="close" id="close">×</button></header><div class="list">${Object.entries(fields.reduce<Record<string, typeof fields>>((groups, field) => { (groups[field.section] ??= []).push(field); return groups; }, {})).map(([section, items]) => `<section class="group"><div class="group-title">${section}</div>${items.map((field) => `<button class="field" data-value="${field.value.replace(/"/g, '&quot;')}">${field.label}<small>${field.value}</small></button>`).join('')}</section>`).join('') || '<div class="empty">Add values in JobFill settings.</div>'}</div></aside>`;
    shadow.querySelector('#close')?.addEventListener('click', () => { dock?.remove(); dock = undefined; });
    shadow.querySelectorAll<HTMLElement>('[data-value]').forEach((field) => field.addEventListener('click', () => navigator.clipboard.writeText(field.dataset.value ?? '')));
    return { docked: true };
  };
  api.runtime.onMessage.addListener(async (message: { type?: string }) => message.type === 'jobfill-toggle-dock' ? toggle() : undefined);
}

import { extensionBrowser } from '../shared/browser';
import { RESUME_STORAGE_KEY } from '../shared/resume';

const root = document.querySelector<HTMLElement>('#resume-viewer')!;
document.body.style.cssText = 'margin:0;background:#15161b;color:#f1f2f5;font:14px system-ui,sans-serif;min-height:100vh;overflow:hidden';
root.style.cssText = 'height:100vh;display:flex;flex-direction:column';
const fileKey = new URLSearchParams(location.search).get('file') || RESUME_STORAGE_KEY;
void extensionBrowser.storage.local.get(fileKey).then((result) => {
  const resume = result[fileKey] as { name?: string; dataUrl?: string } | undefined;
  if (!resume?.dataUrl) { root.innerHTML = '<p>No resume has been uploaded yet.</p>'; return; }
  document.title = `${resume.name ?? 'Resume'} — JobFill`;
  root.innerHTML = `<header style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px;background:#202229;border-bottom:1px solid #393b45"><strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${resume.name ?? 'Resume'}</strong><a style="color:#b9a9ff" href="${resume.dataUrl}" download="${resume.name ?? 'resume'}">Download</a></header><iframe style="display:block;flex:1;width:100%;border:0;background:#fff" title="Resume viewer" src="${resume.dataUrl}"></iframe>`;
});

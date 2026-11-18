import { extensionBrowser } from '../shared/browser';

extensionBrowser.runtime.onMessage.addListener(async (message: { type?: string }) => {
  if (message.type === 'open-options') await extensionBrowser.runtime.openOptionsPage();
  if (message.type === 'jobfill-minimize-dock' || message.type === 'jobfill-close-dock') {
    const tabs = await extensionBrowser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) return extensionBrowser.tabs.sendMessage(tab.id, message);
  }
});

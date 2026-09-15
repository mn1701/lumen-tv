interface LunaRequest { cancel(): void }
interface WebOS {
  platformBack(): void;
  service: { request(uri: string, options: {
    method: string; parameters: Record<string, unknown>;
    onSuccess(value: { returnValue?: boolean; errorText?: string }): void;
    onFailure(error: { errorText?: string; errorCode?: number }): void;
  }): LunaRequest };
}
declare global { interface Window { webOS?: WebOS } }
export function launchInstalled(appId: string): Promise<void> {
  const sdk = window.webOS;
  if (!sdk?.service) return Promise.reject(new Error('Native launch requires the official webOSTV.js SDK on a TV.'));
  if (!/^[a-z0-9][a-z0-9.-]{1,127}$/.test(appId)) return Promise.reject(new Error('Invalid installed application ID.'));
  return new Promise((resolve, reject) => {
    let request: LunaRequest | undefined;
    const timeout = setTimeout(() => { request?.cancel(); reject(new Error('Application launch timed out.')); }, 8000);
    request = sdk.service.request('luna://com.webos.applicationManager', {
      method: 'launch', parameters: { id: appId },
      onSuccess: result => { clearTimeout(timeout); result.returnValue === false ? reject(new Error(result.errorText || 'Application launch rejected.')) : resolve(); },
      onFailure: error => { clearTimeout(timeout); reject(new Error(error.errorText || 'Application unavailable or launch permission denied.')); },
    });
  });
}
export function exitToPlatform() { window.webOS?.platformBack(); }
export function isBack(event: KeyboardEvent) { return event.key === 'Escape' || event.keyCode === 461; }
export function mediaAction(event: KeyboardEvent): 'play' | 'pause' | 'stop' | null {
  return ({ 415: 'play', 19: 'pause', 413: 'stop' } as const)[event.keyCode as 415 | 19 | 413] || null;
}

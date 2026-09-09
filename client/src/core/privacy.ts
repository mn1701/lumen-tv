export interface LocalPrivacy { rememberSession: boolean; cacheCatalog: boolean; hideDescriptions: boolean }
const DEFAULTS: LocalPrivacy = { rememberSession: false, cacheCatalog: false, hideDescriptions: false };
export function localPrivacy(): LocalPrivacy {
  try {
    const value = JSON.parse(localStorage.getItem('lumen.privacy.v1') || '{}');
    return { rememberSession: value.rememberSession === true, cacheCatalog: value.cacheCatalog === true, hideDescriptions: value.hideDescriptions === true };
  } catch { return { ...DEFAULTS }; }
}
export function setLocalPrivacy(value: LocalPrivacy) {
  localStorage.setItem('lumen.privacy.v1', JSON.stringify(value));
  if (!value.cacheCatalog) localStorage.removeItem('lumen.catalog.v1');
  if (!value.rememberSession) localStorage.removeItem('lumen.session.v1');
}
export function eraseLocalData() {
  for (const key of ['lumen.catalog.v1', 'lumen.favorites.v1', 'lumen.session.v1']) localStorage.removeItem(key);
}

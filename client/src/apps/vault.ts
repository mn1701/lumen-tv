const ITERATIONS = 310000;
const AAD = new TextEncoder().encode('lumen-scratchpad-v1');
export interface SealedNote { version: 1; salt: string; iv: string; ciphertext: string }
function base64(bytes: Uint8Array): string { let value = ''; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value); }
function bytes(value: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }
async function key(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (!globalThis.crypto?.subtle) throw new Error('This runtime does not expose Web Crypto. No plaintext fallback is available.');
  if (password.length < 12) throw new Error('Use a password of at least 12 characters.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function sealNote(text: string, password: string): Promise<SealedNote> {
  if (new TextEncoder().encode(text).length > 32000) throw new Error('The scratchpad is limited to 32 KB.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, await key(password, salt), new TextEncoder().encode(text));
  return { version: 1, salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) };
}
export async function openNote(value: SealedNote, password: string): Promise<string> {
  if (value.version !== 1 || typeof value.ciphertext !== 'string' || value.ciphertext.length > 45000) throw new Error('Unsupported or oversized note.');
  const salt = bytes(value.salt), iv = bytes(value.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid note envelope.');
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: AAD }, await key(password, salt), bytes(value.ciphertext));
    return new TextDecoder().decode(plaintext);
  } catch { throw new Error('The note could not be unlocked. Check the password and runtime crypto support.'); }
}

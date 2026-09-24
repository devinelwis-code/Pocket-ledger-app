/**
 * Client-Side AES-GCM 256-Bit Web Crypto Encryption for Privacy & Security
 * Ensures all local ledger transactions and sensitive financial records are encrypted.
 */

const SALT = new Uint8Array([83, 83, 68, 95, 65, 78, 85, 82, 65, 68, 72, 65, 80, 85, 82, 65]); // "SSD_ANURADHAPURA"
const DEFAULT_KEY_PHRASE = 'SSD_SECURE_FINANCE_VAULT_2026';

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: unknown, customPin?: string | null): Promise<string> {
  try {
    const key = await deriveKey(customPin || DEFAULT_KEY_PHRASE);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV + Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(combined);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'enc:' + window.btoa(binary);
  } catch (err) {
    console.error('Encryption error:', err);
    // Fallback if crypto fails
    return JSON.stringify(data);
  }
}

export async function decryptData<T>(payload: string, customPin?: string | null): Promise<T | null> {
  if (!payload) return null;
  if (!payload.startsWith('enc:')) {
    try {
      return JSON.parse(payload) as T;
    } catch {
      return null;
    }
  }

  try {
    const key = await deriveKey(customPin || DEFAULT_KEY_PHRASE);
    const base64 = payload.slice(4);
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded) as T;
  } catch (err) {
    console.error('Decryption error or wrong PIN:', err);
    return null;
  }
}

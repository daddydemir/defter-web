let cachedPublicKey: CryptoKey | null = null

async function fetchPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey
  const res = await fetch('/api/auth/public-key')
  if (!res.ok) throw new Error('Genel anahtar alınamadı')
  const { publicKey: pem } = (await res.json()) as { publicKey: string }
  cachedPublicKey = await crypto.subtle.importKey(
    'spki',
    pemToDer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  return cachedPublicKey
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function canEncrypt(): boolean {
  return typeof globalThis !== 'undefined' && !!globalThis.crypto?.subtle
}

// Bilgileri AES-GCM (simetrik) ile şifreler; AES anahtarı sunucunun RSA
// genel anahtarıyla sarılır. Böylece MITM saldırılarında kimlik bilgileri
// okunamaz. Şifreleme yapılamazsa güvenli olmayan düz metin gönderilmez —
// çağıran gerekirse düz metne düşmeyi kendisi yönetir.
export async function encryptPayload(payload: Record<string, unknown>): Promise<{ enc: { wrappedKey: string; iv: string; data: string } }> {
  const publicKey = await fetchPublicKey()
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, true, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data)
  const rawKey = (await crypto.subtle.exportKey('raw', aesKey)) as unknown as ArrayBuffer
  const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey)
  return {
    enc: {
      wrappedKey: toBase64(wrappedKey),
      iv: toBase64(iv),
      data: toBase64(ciphertext),
    },
  }
}
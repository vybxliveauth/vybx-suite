/**
 * RFC 6238 TOTP — Web Crypto API. Matches backend src/common/totp.ts.
 * Secret: base64url-encoded 20-byte key.
 */

const STEP = 30;
const DIGITS = 6;
const WINDOW = 1;

function base64urlToBytes(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function counterToBytes(counter: number): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, 0, false);
  view.setUint32(4, counter >>> 0, false);
  return buf;
}

async function computeTotp(keyBuf: ArrayBuffer, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", keyBuf, { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, counterToBytes(counter));
  const hmac = new Uint8Array(sig);
  const offset = (hmac[hmac.length - 1]! & 0x0f) as number;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  const keyBuf = base64urlToBytes(secret);
  const counter = Math.floor(Date.now() / 1000 / STEP);
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    if ((await computeTotp(keyBuf, counter + delta)) === token) return true;
  }
  return false;
}

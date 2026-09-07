// Local demo only. Production authentication must be verified by the server.
const encode = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return encode(new Uint8Array(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(salt.match(/../g), b => parseInt(b, 16)), iterations: 100000}, key, 256)));
}
export async function makeCredential(password) {
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derive(password, salt) };
}
export async function checkCredential(password, credential) {
  return Boolean(credential?.salt && credential?.hash && await derive(password, credential.salt) === credential.hash);
}

// File: src/utils/crypto.js


export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 310000,
      hash: 'SHA-512',
    },
    keyMaterial,
    512
  );

  return JSON.stringify({
    salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
    hash: Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
    version: 3,
    iterations: 310000,
    algorithm: 'SHA-512'
  });
}

export async function verifyPassword(storedHash, inputPassword) {
  try {
    const { salt, hash, iterations, algorithm, version } = JSON.parse(storedHash);

    const iters = iterations || 100000;
    const algo = algorithm || 'SHA-256';

    const saltBytes = new Uint8Array(
      salt.match(/.{2}/g).map(byte => parseInt(byte, 16))
    );

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(inputPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iters,
        hash: algo
      },
      keyMaterial,
      algo === 'SHA-512' ? 512 : 256
    );

    const inputHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return inputHash === hash;
  } catch (e) {
    console.error("Password verification failed:", e);
    return false;
  }
}

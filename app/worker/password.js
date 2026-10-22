// Hash de contraseñas con PBKDF2-SHA256 de WebCrypto (nativo en Workers).
// Reemplaza al scrypt en JS que trae Better Auth por defecto, que excede los 10 ms de CPU del plan gratis.
// 100.000 iteraciones es el máximo que acepta el runtime de Workers.
const ITERATIONS = 100_000;
const encoder = new TextEncoder();

const toHex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = hex => new Uint8Array(hex.match(/.{2}/g).map(pair => parseInt(pair, 16)));

async function derive(password, salt, iterations) {
	const key = await crypto.subtle.importKey('raw', encoder.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
	return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

// Formato guardado: pbkdf2$<iteraciones>$<salt hex>$<hash hex>
export async function hashPassword(password) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword({ hash, password }) {
	const [scheme, iterations, salt, expected] = hash.split('$');
	if (scheme !== 'pbkdf2') return false;
	const actual = new Uint8Array(await derive(password, fromHex(salt), Number(iterations)));
	const target = fromHex(expected);
	return actual.length === target.length && crypto.subtle.timingSafeEqual(actual, target);
}

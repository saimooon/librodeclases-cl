import { betterAuth } from 'better-auth';
import { hashPassword, verifyPassword } from './password';

// Proveedores sociales: cada uno se habilita solo si están sus secretos en el Worker
// (npx wrangler secret put GOOGLE_CLIENT_ID, etc.). La URL de callback es /api/auth/callback/<proveedor>.
export function socialProviders(env) {
	const providers = {};
	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		providers.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: 'select_account' };
	}
	if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
		providers.facebook = { clientId: env.FACEBOOK_CLIENT_ID, clientSecret: env.FACEBOOK_CLIENT_SECRET };
	}
	return providers;
}

// Better Auth sobre D1. Se crea por request porque los bindings (env.DB) y el origen llegan con cada request.
export function createAuth(env, request) {
	return betterAuth({
		database: env.DB,
		secret: env.BETTER_AUTH_SECRET,
		baseURL: new URL(request.url).origin,
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 6,
			password: { hash: hashPassword, verify: verifyPassword },
		},
		// Sin envío de correos (Email Sending requiere plan pago) el cambio de correo se aplica sin verificación.
		user: { changeEmail: { enabled: true, updateEmailWithoutVerification: true } },
		// Google y Facebook solo entregan correos confirmados, así que si alguien ya tiene cuenta con ese correo
		// se vincula a la misma cuenta en vez de fallar.
		account: { accountLinking: { enabled: true, trustedProviders: ['google', 'facebook'] } },
		socialProviders: socialProviders(env),
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			// Evita una consulta a D1 en cada request mientras la cookie firmada siga vigente.
			cookieCache: { enabled: true, maxAge: 5 * 60 },
		},
		telemetry: { enabled: false },
	});
}

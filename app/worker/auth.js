import { betterAuth } from 'better-auth';
import { hashPassword, verifyPassword } from './password';

// Better Auth sobre D1. Se crea por request porque los bindings (env.DB) y el origen llegan con cada request.
// Google solo se habilita si están los secretos GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
export function createAuth(env, request) {
	const google = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
		? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: 'select_account' } }
		: {};
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
		account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
		socialProviders: google,
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			// Evita una consulta a D1 en cada request mientras la cookie firmada siga vigente.
			cookieCache: { enabled: true, maxAge: 5 * 60 },
		},
		telemetry: { enabled: false },
	});
}

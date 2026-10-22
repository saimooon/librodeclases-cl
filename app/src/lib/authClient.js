import { createAuthClient } from 'better-auth/react';

// Cliente de Better Auth: habla con /api/auth/* del mismo Worker (misma URL, sesión por cookie).
export const authClient = createAuthClient();

// Traduce los códigos de error de Better Auth a mensajes para la UI.
export function authErrorMessage(error, fallback) {
	const code = error?.code || '';
	if (code.startsWith('USER_ALREADY_EXISTS')) return 'Ese correo ya tiene una cuenta.';
	if (code === 'INVALID_EMAIL_OR_PASSWORD' || code === 'INVALID_PASSWORD') return 'Correo o contraseña incorrectos.';
	if (code === 'INVALID_EMAIL') return 'El correo no es válido.';
	if (code === 'PASSWORD_TOO_SHORT') return 'La contraseña debe tener al menos 6 caracteres.';
	return fallback;
}

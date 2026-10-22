import { useState } from 'react';
import { authClient } from '../lib/authClient';

// Redirige a Google y vuelve a "/" con la sesión iniciada (Better Auth maneja el callback en /api/auth/callback/google).
export default function GoogleButton({ label = 'Continuar con Google' }) {
	const [error, setError] = useState('');

	async function handleClick() {
		setError('');
		const { error: authError } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
		if (authError) setError('No se pudo iniciar sesión con Google.');
	}

	return (
		<div>
			<button type="button" onClick={handleClick} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-ink hover:bg-slate-50">
				{label}
			</button>
			{error && <p className="mt-2 text-sm font-semibold text-coral">{error}</p>}
		</div>
	);
}

import { useEffect, useState } from 'react';
import { authClient } from '../lib/authClient';

const PROVIDERS = {
	google: { name: 'Google', className: 'border border-slate-200 text-ink hover:bg-slate-50' },
	facebook: { name: 'Facebook', className: 'bg-[#1877f2] text-white hover:bg-[#166fe0]' },
};

// Botones "Continuar con Google / Facebook". Solo aparecen los proveedores que el Worker tiene configurados
// (GET /api/auth-config), así que activar uno es cargar sus secretos, sin recompilar el frontend.
// Better Auth redirige al proveedor y vuelve a "/" con la sesión iniciada, o a /login?error=… si falla.
export default function SocialButtons({ verb = 'Continuar' }) {
	const [enabled, setEnabled] = useState([]);
	const [error, setError] = useState('');

	useEffect(() => {
		fetch('/api/auth-config')
			.then(response => response.json())
			.then(config => setEnabled(config.socialProviders.filter(provider => PROVIDERS[provider])))
			.catch(() => setEnabled([]));
	}, []);

	async function signIn(provider) {
		setError('');
		const { error: authError } = await authClient.signIn.social({ provider, callbackURL: '/', errorCallbackURL: '/login' });
		if (authError) setError(`No se pudo iniciar sesión con ${PROVIDERS[provider].name}.`);
	}

	if (!enabled.length) return null;
	return (
		<>
			<div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
				<div className="h-px flex-1 bg-slate-200" /> o <div className="h-px flex-1 bg-slate-200" />
			</div>
			<div className="space-y-3">
				{enabled.map(provider => (
					<button key={provider} type="button" onClick={() => signIn(provider)} className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold ${PROVIDERS[provider].className}`}>
						{verb} con {PROVIDERS[provider].name}
					</button>
				))}
				{error && <p className="text-sm font-semibold text-coral">{error}</p>}
			</div>
		</>
	);
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient, authErrorMessage, GOOGLE_ENABLED } from '../lib/authClient';
import GoogleButton from '../components/GoogleButton';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		setError('');
		setLoading(true);
		const { error: authError } = await authClient.signIn.email({ email: form.email.trim(), password: form.password });
		setLoading(false);
		if (authError) return setError(authErrorMessage(authError, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
		navigate('/');
	}

	return (
		<div className="app-min-h mesh flex flex-col items-center bg-paper px-4">
			<div className="my-auto w-full max-w-sm rounded-3xl bg-white p-8 shadow-soft">
				<div className="mb-6">
					<BrandLogo className="mx-auto h-auto w-40" />
				</div>
				<h1 className="font-display text-2xl font-bold">Inicia sesión</h1>
				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Correo</span>
						<input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Contraseña</span>
						<input type="password" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					{error && <p className="text-sm font-semibold text-coral">{error}</p>}
					<button disabled={loading} type="submit" className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
						{loading ? 'Ingresando…' : 'Ingresar'}
					</button>
				</form>
				{GOOGLE_ENABLED && (
					<>
						<div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
							<div className="h-px flex-1 bg-slate-200" /> o <div className="h-px flex-1 bg-slate-200" />
						</div>
						<GoogleButton label="Continuar con Google" />
					</>
				)}
				<p className="mt-5 text-center text-sm text-slate-500">
					¿No tienes cuenta? <Link to="/register" className="font-bold text-teal">Regístrate gratis</Link>
				</p>
				<Link to="/demo" className="mt-3 block w-full rounded-xl bg-sun/30 px-4 py-2.5 text-center text-sm font-bold text-ink hover:bg-sun/40">Ver demo sin registrarse →</Link>
			</div>
			<Footer />
		</div>
	);
}

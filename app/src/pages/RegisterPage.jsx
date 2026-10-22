import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient, authErrorMessage } from '../lib/authClient';
import { saveTeacherProfile } from '../services/teacherData';
import { resizeImageToDataUrl } from '../lib/image';
import HonorificPicker from '../components/HonorificPicker';
import SocialButtons from '../components/SocialButtons';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';

export default function RegisterPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: '', honorific: '', email: '', password: '', confirmPassword: '', birthdate: '' });
	const [photoFile, setPhotoFile] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		setError('');
		if (!form.name.trim()) return setError('Ingresa tu nombre.');
		if (!form.honorific) return setError('Elige cómo quieres que te llamemos.');
		if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
		if (form.password !== form.confirmPassword) return setError('Las contraseñas no coinciden.');
		if (form.birthdate && new Date(form.birthdate) > new Date()) return setError('La fecha de nacimiento no puede ser futura.');
		setLoading(true);
		try {
			const { data, error: authError } = await authClient.signUp.email({ email: form.email.trim(), password: form.password, name: form.name.trim() });
			if (authError) return setError(authErrorMessage(authError, `No se pudo crear la cuenta (${authError.code || authError.message}).`));
			const photoDataUrl = photoFile ? await resizeImageToDataUrl(photoFile) : null;
			// El Worker crea el registro del profesor (con trial) en la primera llamada; aquí se completa el perfil.
			await saveTeacherProfile(data.user.id, { displayName: form.name.trim(), honorific: form.honorific, birthdate: form.birthdate || null, photoDataUrl });
			navigate('/');
		} catch {
			setError('La cuenta se creó, pero no se pudo guardar el perfil. Puedes completarlo en "Mi perfil".');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="app-min-h mesh flex flex-col items-center bg-paper px-4 pt-8">
			<div className="my-auto w-full max-w-sm rounded-3xl bg-white p-8 shadow-soft">
				<div className="mb-6">
					<BrandLogo className="mx-auto h-auto w-40" />
				</div>
				<h1 className="font-display text-2xl font-bold">Crea tu cuenta</h1>
				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Nombre completo</span>
						<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					<fieldset>
						<legend className="mb-1.5 block text-sm font-semibold">¿Cómo quieres que te llamemos?</legend>
						<HonorificPicker value={form.honorific} onChange={honorific => setForm({ ...form, honorific })} />
					</fieldset>
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Correo</span>
						<input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Contraseña</span>
						<input type="password" required minLength={6} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Repetir contraseña</span>
						<input type="password" required minLength={6} value={form.confirmPassword} onChange={event => setForm({ ...form, confirmPassword: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Fecha de nacimiento <span className="font-normal text-slate-400">(opcional)</span></span>
						<input type="date" value={form.birthdate} onChange={event => setForm({ ...form, birthdate: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm font-semibold">Foto de perfil <span className="font-normal text-slate-400">(opcional)</span></span>
						<input type="file" accept="image/*" onChange={event => setPhotoFile(event.target.files?.[0] || null)} className="w-full text-sm" />
					</label>
					{error && <p className="text-sm font-semibold text-coral">{error}</p>}
					<button disabled={loading} type="submit" className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
						{loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}
					</button>
				</form>
				<SocialButtons verb="Registrarse" />
				<p className="mt-5 text-center text-sm text-slate-500">
					¿Ya tienes cuenta? <Link to="/login" className="font-bold text-teal">Inicia sesión</Link>
				</p>
				<Link to="/demo" className="mt-3 block w-full rounded-xl bg-sun/30 px-4 py-2.5 text-center text-sm font-bold text-ink hover:bg-sun/40">Ver demo sin registrarse →</Link>
			</div>
			<Footer />
		</div>
	);
}


import { useState } from 'react';
import { authClient } from '../lib/authClient';
import { saveTeacherProfile } from '../services/teacherData';
import { resizeImageToDataUrl } from '../lib/image';

export default function ProfileEditForm({ teacher, user, onSaved }) {
	const isPasswordAccount = user.providers?.includes('credential');
	const [name, setName] = useState(teacher?.displayName || user.displayName || '');
	const [nameStatus, setNameStatus] = useState('');

	const [newEmail, setNewEmail] = useState(user.email || '');
	const [emailStatus, setEmailStatus] = useState('');

	const [newPhone, setNewPhone] = useState(teacher?.phoneNumber || '+56');
	const [phoneStatus, setPhoneStatus] = useState('');

	const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
	const [passwordStatus, setPasswordStatus] = useState('');

	const [photoStatus, setPhotoStatus] = useState('');

	async function saveName(event) {
		event.preventDefault();
		setNameStatus('Guardando…');
		try {
			await authClient.updateUser({ name: name.trim() });
			await saveTeacherProfile(user.uid, { displayName: name.trim() });
			setNameStatus('Nombre actualizado.');
			onSaved?.();
		} catch {
			setNameStatus('No se pudo actualizar el nombre.');
		}
	}

	async function changeEmail(event) {
		event.preventDefault();
		setEmailStatus('Actualizando…');
		const { error } = await authClient.changeEmail({ newEmail: newEmail.trim() });
		if (error) return setEmailStatus(error.code?.startsWith('USER_ALREADY_EXISTS') ? 'Ese correo ya está en uso.' : 'No se pudo actualizar el correo.');
		try {
			await saveTeacherProfile(user.uid, { email: newEmail.trim() });
			setEmailStatus('Correo actualizado.');
			onSaved?.();
		} catch {
			setEmailStatus('El correo de acceso cambió, pero no se pudo actualizar en tu perfil.');
		}
	}

	// Sin verificación por SMS: el teléfono es solo un dato de contacto del perfil.
	async function savePhone(event) {
		event.preventDefault();
		setPhoneStatus('Guardando…');
		try {
			const phone = newPhone.trim();
			await saveTeacherProfile(user.uid, { phoneNumber: phone === '+56' ? null : phone });
			setPhoneStatus('Teléfono actualizado.');
			onSaved?.();
		} catch {
			setPhoneStatus('No se pudo actualizar el teléfono.');
		}
	}

	async function changePassword(event) {
		event.preventDefault();
		if (passwords.next.length < 6) return setPasswordStatus('La nueva contraseña debe tener al menos 6 caracteres.');
		if (passwords.next !== passwords.confirm) return setPasswordStatus('Las contraseñas no coinciden.');
		setPasswordStatus('Actualizando…');
		const { error } = await authClient.changePassword({ currentPassword: passwords.current, newPassword: passwords.next, revokeOtherSessions: true });
		if (error) return setPasswordStatus(error.code === 'INVALID_PASSWORD' ? 'La contraseña actual no es correcta.' : 'No se pudo cambiar la contraseña.');
		setPasswords({ current: '', next: '', confirm: '' });
		setPasswordStatus('Contraseña actualizada.');
	}

	async function handlePhotoChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		setPhotoStatus('Subiendo…');
		try {
			const photoDataUrl = await resizeImageToDataUrl(file);
			await saveTeacherProfile(user.uid, { photoDataUrl });
			setPhotoStatus('Foto actualizada.');
			onSaved?.();
		} catch {
			setPhotoStatus('No se pudo actualizar la foto.');
		} finally {
			event.target.value = '';
		}
	}

	async function removePhoto() {
		setPhotoStatus('Eliminando…');
		try {
			await saveTeacherProfile(user.uid, { photoDataUrl: null });
			setPhotoStatus('Foto eliminada.');
			onSaved?.();
		} catch {
			setPhotoStatus('No se pudo eliminar la foto.');
		}
	}

	return (
		<div className="space-y-5">
			<form onSubmit={saveName} className="rounded-2xl border border-slate-200/80 bg-white p-5">
				<h3 className="font-display text-base font-bold">Nombre</h3>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<input aria-label="Nombre" value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5" />
					<button type="submit" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white">Guardar</button>
				</div>
				{nameStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{nameStatus}</p>}
			</form>

			<form onSubmit={changeEmail} className="rounded-2xl border border-slate-200/80 bg-white p-5">
				<h3 className="font-display text-base font-bold">Correo</h3>
				{isPasswordAccount ? (
					<>
						<div className="mt-3">
							<input type="email" required value={newEmail} onChange={event => setNewEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
						</div>
						<button type="submit" className="mt-3 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white">Actualizar correo</button>
					</>
				) : (
					<p className="mt-2 text-sm text-slate-500">Tu correo ({user.email}) se gestiona con tu cuenta de Google.</p>
				)}
				{emailStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{emailStatus}</p>}
			</form>

			{isPasswordAccount && (
				<form onSubmit={changePassword} className="rounded-2xl border border-slate-200/80 bg-white p-5">
					<h3 className="font-display text-base font-bold">Contraseña</h3>
					<div className="mt-3 space-y-2">
						<input type="password" required placeholder="Contraseña actual" value={passwords.current} onChange={event => setPasswords({ ...passwords, current: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
						<input type="password" required minLength={6} placeholder="Nueva contraseña" value={passwords.next} onChange={event => setPasswords({ ...passwords, next: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
						<input type="password" required minLength={6} placeholder="Repetir nueva contraseña" value={passwords.confirm} onChange={event => setPasswords({ ...passwords, confirm: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
					</div>
					<button type="submit" className="mt-3 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white">Cambiar contraseña</button>
					{passwordStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{passwordStatus}</p>}
				</form>
			)}

			<form onSubmit={savePhone} className="rounded-2xl border border-slate-200/80 bg-white p-5">
				<h3 className="font-display text-base font-bold">Teléfono</h3>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<input value={newPhone} onChange={event => setNewPhone(event.target.value)} placeholder="+56912345678" className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5" />
					<button type="submit" className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white">Guardar</button>
				</div>
				{phoneStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{phoneStatus}</p>}
			</form>

			<div className="rounded-2xl border border-slate-200/80 bg-white p-5">
				<h3 className="font-display text-base font-bold">Foto de perfil</h3>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-ink hover:bg-slate-50">
						Subir / cambiar
						<input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
					</label>
					{teacher?.photoDataUrl && (
						<button type="button" onClick={removePhoto} className="rounded-xl px-4 py-2.5 text-sm font-bold text-coral">Eliminar foto</button>
					)}
				</div>
				{photoStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{photoStatus}</p>}
			</div>
		</div>
	);
}

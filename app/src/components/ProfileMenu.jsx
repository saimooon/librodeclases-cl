import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { teacherTitle } from '../lib/domain';

function initials(name) {
	if (!name) return '?';
	return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

export default function ProfileMenu({ teacher, user, onOpenProfile, onLogout }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const { dark, toggleDark } = useTheme();
	const name = teacher?.displayName || user.displayName || 'Profesor(a)';
	const contact = user.email || user.phoneNumber || '—';

	useEffect(() => {
		function handleClickOutside(event) {
			if (ref.current && !ref.current.contains(event.target)) setOpen(false);
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div ref={ref} className="relative">
			<button aria-label="Abrir menú de perfil" onClick={() => setOpen(value => !value)} className="flex items-center gap-3 rounded-2xl px-1 py-1 hover:bg-slate-50">
				{teacher?.photoDataUrl ? (
					<img src={teacher.photoDataUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
				) : (
					<span className="grid h-10 w-10 place-items-center rounded-full bg-teal text-sm font-bold text-white">{initials(name)}</span>
				)}
			</button>
			{open && (
				<div className="absolute right-0 z-40 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
					<div className="flex items-center gap-3 border-b border-slate-100 pb-3">
						{teacher?.photoDataUrl ? (
							<img src={teacher.photoDataUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
						) : (
							<span className="grid h-12 w-12 place-items-center rounded-full bg-teal text-base font-bold text-white">{initials(name)}</span>
						)}
						<div className="min-w-0">
							<p className="truncate font-display font-bold">{teacher?.displayName || user.displayName ? teacherTitle(teacher, user) : name}</p>
							<p className="truncate text-xs text-slate-400">{contact}</p>
						</div>
					</div>
					<button onClick={toggleDark} className="mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">
						<span>Tema {dark ? 'oscuro' : 'claro'}</span>
						<span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${dark ? 'bg-teal' : 'bg-slate-200'}`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${dark ? 'translate-x-5' : ''}`} /></span>
					</button>
					<button onClick={() => { setOpen(false); onOpenProfile(); }} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-ink hover:bg-slate-50">Ver perfil completo</button>
					<button onClick={onLogout} className="mt-2 w-full rounded-xl px-3 py-2 text-sm font-semibold text-coral hover:bg-slate-50">Cerrar sesión</button>
				</div>
			)}
		</div>
	);
}

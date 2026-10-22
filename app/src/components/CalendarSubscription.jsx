import { useState } from 'react';
import { disableCalendarFeed, enableCalendarFeed } from '../services/teacherData';

// Calendario en vivo: un enlace privado (/api/calendar/<token>.ics) al que Google Calendar se suscribe.
// Queda como un calendario aparte y de solo lectura en Google: crear, cambiar o eliminar una evaluación aquí
// se refleja allá (Google lo actualiza cada algunas horas), y para quitarlo todo basta con desuscribirse.
export default function CalendarSubscription({ teacher, demo }) {
	const [status, setStatus] = useState('');
	const [busy, setBusy] = useState(false);
	const token = teacher?.calendarToken;
	const feedUrl = token ? `${window.location.origin}/api/calendar/${token}.ics` : '';
	const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');
	const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

	async function run(action, message) {
		setBusy(true);
		setStatus('');
		try {
			await action();
			setStatus(message);
		} catch {
			setStatus('No se pudo completar. Revisa tu conexión e inténtalo de nuevo.');
		} finally {
			setBusy(false);
		}
	}

	function regenerate() {
		if (!confirm('Se creará un enlace nuevo y el actual dejará de mostrar evaluaciones. Cualquier calendario suscrito al enlace actual quedará vacío y tendrás que volver a agregarlo. ¿Continuar?')) return;
		run(enableCalendarFeed, 'Enlace nuevo generado. Vuelve a agregarlo a Google Calendar.');
	}

	function disable() {
		if (!confirm('El calendario en vivo dejará de mostrar evaluaciones en Google Calendar (u otros calendarios suscritos). ¿Desactivar?')) return;
		run(disableCalendarFeed, 'Calendario en vivo desactivado.');
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(feedUrl);
			setStatus('Enlace copiado. No lo compartas: quien lo tenga puede ver tus evaluaciones.');
		} catch {
			setStatus(feedUrl);
		}
	}

	const button = 'rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50';
	return (
		<div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
			<h2 className="font-display text-base font-bold">Calendario en vivo en Google Calendar</h2>
			<p className="mt-1 text-sm text-slate-500">
				Agrega todas tus evaluaciones como un calendario aparte en Google. Se actualiza solo: si creas, cambias o eliminas una
				evaluación aquí, el cambio llega a Google (Google lo revisa cada algunas horas). Para quitarlo, basta con desuscribirte
				en Google y desaparecen todas juntas, sin tocar tus otros eventos.
			</p>
			{demo ? (
				<p className="mt-3 rounded-xl bg-paper p-3 text-sm text-slate-500">Disponible al crear una cuenta.</p>
			) : token ? (
				<>
					<div className="mt-3 flex flex-wrap gap-2">
						<a href={googleUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white">Agregar a Google Calendar</a>
						<button type="button" onClick={copy} className={`${button} text-teal`}>Copiar enlace (iPhone, Outlook)</button>
					</div>
					<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
						<button type="button" disabled={busy} onClick={regenerate} className="text-slate-500 hover:text-ink disabled:opacity-50">Generar enlace nuevo</button>
						<button type="button" disabled={busy} onClick={disable} className="text-coral disabled:opacity-50">Desactivar</button>
					</div>
				</>
			) : (
				<button type="button" disabled={busy} onClick={() => run(enableCalendarFeed, 'Listo. Ahora toca «Agregar a Google Calendar».')} className="mt-3 rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
					{busy ? 'Activando…' : 'Activar calendario en vivo'}
				</button>
			)}
			{status && <p className="mt-2 break-all text-xs font-semibold text-slate-500">{status}</p>}
		</div>
	);
}

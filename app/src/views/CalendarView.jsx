import { useMemo, useState } from 'react';
import { allEvaluations, timestamp } from '../lib/domain';
import { buildIcs, eventTitle, googleCalendarUrl } from '../lib/calendarExport';
import { downloadBlob } from '../lib/download';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOT = { coral: 'bg-coral', teal: 'bg-teal', sun: 'bg-sun', blue: 'bg-[#4166aa]', violet: 'bg-[#7451af]' };
const WHEN = [
	{ key: 'upcoming', label: 'Próximas' },
	{ key: 'pending', label: 'Pasadas con notas pendientes' },
	{ key: 'all', label: 'Todas' },
];

const pad = value => String(value).padStart(2, '0');
const toKey = date => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
const fromKey = key => new Date(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)));

function relativeDay(key, todayKey) {
	const days = Math.round((fromKey(key) - fromKey(todayKey)) / 86400000);
	if (days === 0) return 'Hoy';
	if (days === 1) return 'Mañana';
	if (days === -1) return 'Ayer';
	return days > 0 ? `En ${days} días` : `Hace ${-days} días`;
}

// Semanas del mes (lunes a domingo), con días de relleno de los meses vecinos.
function monthGrid(year, month) {
	const first = new Date(year, month, 1);
	const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
	const lastDay = new Date(year, month + 1, 0);
	const weeks = Math.ceil(((first.getDay() + 6) % 7 + lastDay.getDate()) / 7);
	return [...Array(weeks * 7)].map((_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export default function CalendarView({ institutions, onOpenCourse }) {
	const todayKey = toKey(new Date());
	const [mode, setMode] = useState('month');
	const [institutionId, setInstitutionId] = useState('all');
	const [courseIds, setCourseIds] = useState([]);
	const [type, setType] = useState('all');
	const [when, setWhen] = useState('upcoming');
	const [cursor, setCursor] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() }; });
	const [selectedDay, setSelectedDay] = useState(todayKey);
	const [exported, setExported] = useState(false);

	const evaluations = useMemo(() => allEvaluations(institutions), [institutions]);
	const visibleInstitutions = institutionId === 'all' ? institutions : institutions.filter(item => item.id === institutionId);
	const courseOptions = visibleInstitutions.flatMap(institution => institution.courses.map(course => ({ id: course.id, name: course.name, color: course.color, institutionName: institution.name })));
	const types = [...new Set(evaluations.map(item => item.type).filter(Boolean))].sort();

	const filtered = evaluations.filter(item =>
		(institutionId === 'all' || item.institutionId === institutionId)
		&& (!courseIds.length || courseIds.includes(item.courseId))
		&& (type === 'all' || item.type === type));
	const listItems = filtered.filter(item => (when === 'upcoming' ? item.key >= todayKey : when === 'pending' ? item.key < todayKey && !item.graded?.complete : true));
	const byDay = filtered.reduce((map, item) => ({ ...map, [item.key]: [...(map[item.key] || []), item] }), {});

	function changeInstitution(id) {
		setInstitutionId(id);
		setCourseIds([]);
	}
	function toggleCourse(id) {
		setCourseIds(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
	}
	function moveMonth(step) {
		setCursor(({ year, month }) => { const date = new Date(year, month + step, 1); return { year: date.getFullYear(), month: date.getMonth() }; });
	}
	// Descarga un .ics con las evaluaciones de los filtros actuales (institución, cursos y tipo).
	function exportIcs() {
		const items = [...filtered].sort((a, b) => a.key.localeCompare(b.key));
		downloadBlob(new Blob([buildIcs(items, window.location.origin)], { type: 'text/calendar;charset=utf-8' }), `evaluaciones-librodeclases_${timestamp()}.ics`);
		setExported(true);
	}
	function goToday() {
		const now = new Date();
		setCursor({ year: now.getFullYear(), month: now.getMonth() });
		setSelectedDay(todayKey);
	}

	const selectClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold sm:text-sm';

	return (
		<section className="fade-up space-y-4">
			<div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
						<label className="block min-w-0">
							<span className="mb-1.5 block text-xs font-semibold text-slate-400">Institución</span>
							<select value={institutionId} onChange={event => changeInstitution(event.target.value)} className={selectClass}>
								<option value="all">Todas las instituciones</option>
								{institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
							</select>
						</label>
						<label className="block min-w-0">
							<span className="mb-1.5 block text-xs font-semibold text-slate-400">Tipo de evaluación</span>
							<select value={type} onChange={event => setType(event.target.value)} className={selectClass}>
								<option value="all">Todos los tipos</option>
								{types.map(item => <option key={item}>{item}</option>)}
							</select>
						</label>
					</div>
					<div className="grid grid-cols-2 rounded-xl bg-paper p-1 text-sm font-bold" role="tablist" aria-label="Vista del calendario">
						{[['month', 'Calendario'], ['list', 'Lista']].map(([key, label]) => (
							<button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={`rounded-lg px-4 py-2 ${mode === key ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>{label}</button>
						))}
					</div>
				</div>
				{courseOptions.length > 0 && (
					<div className="mt-4">
						<span className="mb-1.5 block text-xs font-semibold text-slate-400">Cursos {courseIds.length ? `(${courseIds.length} seleccionados)` : '(todos)'}</span>
						<div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
							<button aria-pressed={!courseIds.length} onClick={() => setCourseIds([])} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!courseIds.length ? 'course-tab-active bg-ink text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>Todos</button>
							{courseOptions.map(course => (
								<button key={course.id} aria-pressed={courseIds.includes(course.id)} onClick={() => toggleCourse(course.id)} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${courseIds.includes(course.id) ? 'course-tab-active bg-ink text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
									<span className={`h-2 w-2 rounded-full ${DOT[course.color] || 'bg-slate-400'}`} />
									{course.name}{institutionId === 'all' && institutions.length > 1 ? <span className="opacity-60">· {course.institutionName}</span> : null}
								</button>
							))}
						</div>
					</div>
				)}
				<div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-xs text-slate-500">{filtered.length ? `${filtered.length} evaluación(es) con estos filtros` : 'No hay evaluaciones con estos filtros.'}</p>
					<button disabled={!filtered.length} onClick={exportIcs} className="rounded-xl px-4 py-2 text-sm font-bold text-teal ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">Exportar a calendario (.ics)</button>
				</div>
				{exported && (
					<p className="mt-2 rounded-xl bg-[#e5f4f1] p-3 text-xs">
						Archivo descargado. Para verlo en Google Calendar abre{' '}
						<a href="https://calendar.google.com/calendar/r/settings/export" target="_blank" rel="noopener noreferrer" className="font-bold text-teal underline">Configuración → Importar y exportar</a>
						, elige el archivo y el calendario donde quieres las evaluaciones. Es una copia del momento: si después cambias fechas, usa «+ Calendar» en esa evaluación o vuelve a exportar.
					</p>
				)}
			</div>

			{mode === 'month' ? (
				<MonthCalendar cursor={cursor} byDay={byDay} todayKey={todayKey} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMove={moveMonth} onToday={goToday} onOpenCourse={onOpenCourse} />
			) : (
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
					<div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
						{WHEN.map(item => (
							<button key={item.key} aria-pressed={when === item.key} onClick={() => setWhen(item.key)} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${when === item.key ? 'course-tab-active bg-ink text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{item.label}</button>
						))}
					</div>
					<EvaluationList items={listItems} todayKey={todayKey} groupByMonth onOpenCourse={onOpenCourse} empty={when === 'upcoming' ? 'No hay evaluaciones próximas con estos filtros.' : 'No hay evaluaciones con estos filtros.'} />
				</div>
			)}
		</section>
	);
}

function MonthCalendar({ cursor, byDay, todayKey, selectedDay, onSelectDay, onMove, onToday, onOpenCourse }) {
	const days = monthGrid(cursor.year, cursor.month);
	const selectedItems = byDay[selectedDay] || [];
	return (
		<div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
			<div className="mb-3 flex items-center justify-between gap-2">
				<button aria-label="Mes anterior" onClick={() => onMove(-1)} className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold ring-1 ring-slate-200 hover:bg-slate-50">‹</button>
				<div className="text-center">
					<h2 className="font-display text-lg font-bold sm:text-xl">{MONTHS[cursor.month]} {cursor.year}</h2>
					<button onClick={onToday} className="text-xs font-bold text-teal">Ir a hoy</button>
				</div>
				<button aria-label="Mes siguiente" onClick={() => onMove(1)} className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold ring-1 ring-slate-200 hover:bg-slate-50">›</button>
			</div>
			<div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
				{WEEKDAYS.map((day, index) => <span key={index} className="py-1">{day}</span>)}
			</div>
			<div className="grid grid-cols-7 gap-1">
				{days.map(date => {
					const key = toKey(date);
					const items = byDay[key] || [];
					const inMonth = date.getMonth() === cursor.month;
					const selected = key === selectedDay;
					return (
						<button
							key={key}
							onClick={() => onSelectDay(key)}
							aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]}: ${items.length} evaluación(es)`}
							aria-pressed={selected}
							className={`flex min-h-12 min-w-0 flex-col items-stretch rounded-lg p-1 text-left sm:min-h-24 sm:p-1.5 ${selected ? 'ring-2 ring-teal' : 'ring-1 ring-slate-200'} ${inMonth ? '' : 'opacity-40'} hover:bg-slate-50`}
						>
							<span className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-xs font-bold sm:mx-0 ${key === todayKey ? 'bg-teal text-white' : ''}`}>{date.getDate()}</span>
							{/* Móvil: puntos de color; escritorio: título de las evaluaciones */}
							<span className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
								{items.slice(0, 4).map(item => <span key={item.id} className={`h-1.5 w-1.5 rounded-full ${DOT[item.courseColor] || 'bg-slate-400'}`} />)}
							</span>
							<span className="mt-1 hidden space-y-0.5 sm:block">
								{items.slice(0, 2).map(item => (
									<span key={item.id} className="flex items-center gap-1 truncate rounded bg-paper px-1 py-0.5 text-[11px] font-semibold">
										<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[item.courseColor] || 'bg-slate-400'}`} />
										<span className="truncate">{item.courseName}: {item.title}</span>
									</span>
								))}
								{items.length > 2 && <span className="block px-1 text-[11px] font-semibold text-slate-400">+{items.length - 2} más</span>}
							</span>
						</button>
					);
				})}
			</div>
			<div className="mt-4 border-t border-slate-100 pt-4">
				<h3 className="mb-2 text-sm font-semibold">{relativeDay(selectedDay, todayKey)} · {fromKey(selectedDay).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
				<EvaluationList items={selectedItems} todayKey={todayKey} onOpenCourse={onOpenCourse} empty="No hay evaluaciones este día." />
			</div>
		</div>
	);
}

function EvaluationList({ items, todayKey, groupByMonth = false, onOpenCourse, empty }) {
	if (!items.length) return <p className="rounded-xl bg-paper p-4 text-center text-sm text-slate-400">{empty}</p>;
	return (
		<ul className="space-y-2">
			{items.map((item, index) => {
				const date = fromKey(item.key);
				const monthLabel = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
				const showMonth = groupByMonth && (index === 0 || items[index - 1].key.slice(0, 6) !== item.key.slice(0, 6));
				const past = item.key < todayKey;
				const graded = item.graded;
				return (
					<li key={`${item.courseId}-${item.id}`}>
						{showMonth && <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400 first:mt-0">{monthLabel}</p>}
						<div className="flex items-center gap-3 rounded-xl bg-paper p-3">
							<div className="w-12 shrink-0 text-center">
								<p className="text-[10px] font-bold uppercase text-slate-400">{date.toLocaleDateString('es-CL', { weekday: 'short' })}</p>
								<p className="font-display text-xl font-bold leading-none">{date.getDate()}</p>
								<p className="text-[10px] font-semibold text-slate-400">{MONTHS[date.getMonth()].slice(0, 3)}</p>
							</div>
							<span className={`h-10 w-1 shrink-0 rounded-full ${DOT[item.courseColor] || 'bg-slate-400'}`} />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold">{item.title}</p>
								<p className="truncate text-xs text-slate-500">{item.courseName} · {item.institutionName}</p>
								<p className="text-xs">
									<span className="text-teal">{item.weight}% · {item.type}</span>
									<span className="text-slate-400"> · {relativeDay(item.key, todayKey)}</span>
									{past && graded && <span className={graded.complete ? 'text-teal' : 'font-semibold text-[#987513]'}> · {graded.complete ? '✓ notas completas' : `${graded.graded}/${graded.total} notas`}</span>}
								</p>
							</div>
							<div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
								<a href={googleCalendarUrl(item, window.location.origin)} target="_blank" rel="noopener noreferrer" aria-label={`Agregar "${eventTitle(item)}" a Google Calendar`} title="Agregar a Google Calendar" className="rounded-lg px-2.5 py-1.5 text-center text-xs font-bold text-teal ring-1 ring-slate-200">+ Calendar</a>
								<button onClick={() => onOpenCourse(item.institutionId, item.courseId)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-teal ring-1 ring-slate-200">Notas →</button>
							</div>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

import { useEffect, useMemo, useState } from 'react';
import { average, courseProgress, formatGrade, STANDINGS, standingMessages, studentStanding } from '../lib/domain';
import CourseProgressBar from '../components/CourseProgressBar';
import HonorificPicker from '../components/HonorificPicker';

const MESSAGES = [
	'Cada nota que registras ayuda a un estudiante a mejorar.',
	'Un buen seguimiento hoy evita sorpresas al final del semestre.',
	'Tus estudiantes avanzan gracias a tu dedicación.',
	'Pequeños registros diarios hacen grandes diferencias.',
	'Gracias por tu trabajo, la educación depende de profesores como tú.',
];

function greeting(hour) {
	if (hour < 12) return 'Buenos días';
	if (hour < 19) return 'Buenas tardes';
	return 'Buenas noches';
}

// Mensaje según el estado del curso seleccionado.
function statusMessage(title, course, progress) {
	if (!course) return `${title}, comienza creando tu primer curso en la sección Cursos.`;
	if (!course.evaluations.length) return `${title}, aún no hay evaluaciones en ${course.name}. Crea la primera desde el Libro de notas.`;
	if (progress.pendingGrades > 0) return `${title}, te quedan ${progress.pendingGrades} nota(s) por registrar en ${course.name} (${progress.pendingEvaluations} evaluación(es) en curso).`;
	if (progress.unplannedWeight > 0) return `¡Notas al día, ${title}! En ${course.name} aún falta definir un ${progress.unplannedWeight}% de la ponderación.`;
	return `¡Excelente, ${title}! ${course.name} tiene el 100% de sus evaluaciones calificadas.`;
}

export default function DashboardView({ institutions, institution, course, onSelectCourse, title, shortTitle, onOpenGradebook, needsHonorific, onSetHonorific }) {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 30000);
		return () => clearInterval(timer);
	}, []);
	const message = useMemo(() => MESSAGES[new Date().getDate() % MESSAGES.length], []);

	const courses = institution?.courses || [];
	const totalStudents = courses.reduce((sum, item) => sum + item.students.length, 0);
	const allCourses = institutions.reduce((sum, item) => sum + item.courses.length, 0);
	const averages = course?.students.map(student => average(course, student.id)).filter(value => value != null) || [];
	const classAverage = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : null;
	const progress = courseProgress(course);
	const standings = (course?.students || []).filter(student => student.active !== false).map(student => ({ student, standing: studentStanding(course, student.id) }));
	const atRisk = standings.filter(item => ['failed', 'risk'].includes(item.standing.status)).sort((first, second) => (first.standing.currentAverage ?? 0) - (second.standing.currentAverage ?? 0));

	return (
		<section className="fade-up">
			<div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-ink p-5 text-white shadow-soft sm:mb-7 sm:flex-row sm:items-end sm:p-8">
				<div className="min-w-0">
					<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 sm:mb-5">
						<span className="h-2 w-2 rounded-full bg-sun"></span> {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
					</div>
					<h2 className="max-w-lg font-display text-2xl font-bold leading-tight sm:text-4xl">{greeting(now.getHours())}, <span className="text-sun">{shortTitle}.</span></h2>
					<p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{message}</p>
				</div>
				<div className="rounded-2xl bg-white/10 p-4 sm:min-w-56">
					<p className="text-xs text-slate-300">Nota acumulada promedio</p>
					{courses.length > 1 && (
						<select value={course?.id || ''} onChange={event => onSelectCourse(event.target.value)} className="dashboard-course-picker mb-2 mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm font-semibold text-white">
							{courses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
						</select>
					)}
					<p className="mt-1 font-display text-4xl font-bold">{formatGrade(classAverage)}</p>
					<p className="mt-1 text-xs text-slate-300">{course?.name || 'Sin cursos'}{course ? ` · escala ${course.scaleMin.toFixed(1)} a ${course.scaleMax.toFixed(1)}` : ''}</p>
				</div>
			</div>
			{needsHonorific && (
				<div className="mb-6 rounded-2xl border border-teal/30 bg-white p-5 shadow-sm sm:mb-7">
					<h3 className="font-display text-lg font-bold">¿Cómo quieres que te llamemos?</h3>
					<p className="mb-3 mt-1 text-sm text-slate-500">Elige según tu género o preferencia. Puedes cambiarlo después en Mi perfil › Ajustes.</p>
					<div className="max-w-sm"><HonorificPicker value="" onChange={onSetHonorific} /></div>
				</div>
			)}
			{course && (
				<div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:mb-7">
					<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
						<h3 className="font-display text-lg font-bold">Avance de {course.name}</h3>
						<p className="text-sm font-semibold text-teal">{progress.completedWeight}% calificado</p>
					</div>
					<p className="mt-1 text-sm text-slate-500">{statusMessage(title, course, progress)}</p>
					<CourseProgressBar progress={progress} className="mt-4" />
				</div>
			)}
			{course && standings.length > 0 && (
				<div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:mb-7">
					<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
						<h3 className="font-display text-lg font-bold">Seguimiento de estudiantes</h3>
						<p className="text-xs text-slate-400">Comparado con la ponderación ya calificada · aprueba con {formatGrade(standings[0].standing.pass)}</p>
					</div>
					<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
						{['failed', 'risk', 'warning', 'ok', 'none'].map(status => (
							<button key={status} onClick={() => onOpenGradebook(status)} className="rounded-xl bg-paper p-3 text-left hover:ring-1 hover:ring-slate-200">
								<span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${STANDINGS[status].dot}`} />{STANDINGS[status].label}</span>
								<span className="mt-1 block font-display text-2xl font-bold">{standings.filter(item => item.standing.status === status).length}</span>
							</button>
						))}
					</div>
					{atRisk.length > 0 && (
						<ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
							{atRisk.slice(0, 5).map(({ student, standing }) => (
								<li key={student.id} className="flex items-center justify-between gap-3 py-2.5">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold">{student.name}</p>
										<p className={`text-xs font-semibold ${STANDINGS[standing.status].text}`}>{standingMessages(standing).need}</p>
									</div>
									<div className="shrink-0 text-right">
										<p className="font-display font-bold">{formatGrade(standing.accumulated)}</p>
										<p className="text-[11px] text-slate-400">Prom. {formatGrade(standing.currentAverage)}</p>
									</div>
								</li>
							))}
						</ul>
					)}
					{atRisk.length > 0 && <button onClick={() => onOpenGradebook('risk')} className="mt-3 text-sm font-bold text-teal">Ver {atRisk.length > 5 ? `los ${atRisk.length} estudiantes` : 'detalle'} de riesgo en el Libro de notas →</button>}
				</div>
			)}
			<div className="mb-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
				<StatCard label="Cursos activos" value={allCourses} hint={`En ${institutions.length} institución(es)`} />
				<StatCard label="Estudiantes" value={totalStudents} hint="En esta institución" />
				<StatCard label="Evaluaciones" value={courses.reduce((sum, item) => sum + item.evaluations.length, 0)} hint="En esta institución" />
				<StatCard label="Notas pendientes" value={progress.pendingGrades} hint={`En ${course?.name || 'este curso'}`} />
			</div>
		</section>
	);
}


function StatCard({ label, value, hint }) {
	return (
		<div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
			<p className="text-sm text-slate-500">{label}</p>
			<p className="mt-2 font-display text-2xl font-bold sm:mt-3 sm:text-3xl">{value}</p>
			<p className="mt-2 truncate text-xs text-slate-400">{hint}</p>
		</div>
	);
}

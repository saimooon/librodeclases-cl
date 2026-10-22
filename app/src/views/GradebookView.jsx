import { useState } from 'react';
import { ANNOTATION_TYPES, annotationCounts, courseProgress, formatGrade, MAX_TOTAL_WEIGHT, passingGrade, sortStudents, STANDINGS, standingMessages, studentStanding } from '../lib/domain';
import CourseProgressBar from '../components/CourseProgressBar';
import EvaluationStatsModal from '../components/EvaluationStatsModal';

const FILTERS = [
	{ key: 'all', label: 'Todos' },
	{ key: 'failed', label: STANDINGS.failed.label, dot: STANDINGS.failed.dot },
	{ key: 'risk', label: STANDINGS.risk.label, dot: STANDINGS.risk.dot },
	{ key: 'warning', label: STANDINGS.warning.label, dot: STANDINGS.warning.dot },
	{ key: 'ok', label: STANDINGS.ok.label, dot: STANDINGS.ok.dot },
	{ key: 'none', label: STANDINGS.none.label, dot: STANDINGS.none.dot },
	{ key: 'inactive', label: 'Retirados' },
];

function CourseTabs({ courses, selectedCourseId, onSelectCourse }) {
	return (
		<div className="mb-5 hidden flex-wrap gap-2 sm:flex">
			{courses.map(item => (
				<button key={item.id} onClick={() => onSelectCourse(item.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${item.id === selectedCourseId ? 'course-tab-active bg-ink text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
					{item.name}
				</button>
			))}
		</div>
	);
}

function StudentFilters({ filter, onFilter, query, onQuery, counts }) {
	return (
		<div className="border-b border-slate-100 p-4 sm:px-5">
			<input type="search" value={query} onChange={event => onQuery(event.target.value)} placeholder="Buscar por nombre o RUT" aria-label="Buscar estudiante" className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base sm:max-w-xs sm:text-sm" />
			<div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar estudiantes por situación">
				{FILTERS.map(item => (
					<button key={item.key} aria-pressed={filter === item.key} onClick={() => onFilter(item.key)} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${filter === item.key ? 'course-tab-active bg-ink text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
						{item.dot && <span className={`h-2 w-2 rounded-full ${item.dot}`} />}
						{item.label} <span className="opacity-70">{counts[item.key]}</span>
					</button>
				))}
			</div>
		</div>
	);
}

// La key incluye el valor guardado para que el input se re-monte con el dato actualizado
// (es no controlado y existen dos layouts: móvil y escritorio).
function GradeInput({ course, student, evaluation, readOnly, onSetGrade, className }) {
	const value = course.grades?.[student.id]?.[evaluation.id] ?? '';
	return (
		<input
			key={`${evaluation.id}-${value}`}
			disabled={readOnly}
			aria-label={`Nota de ${student.name} en ${evaluation.title}`}
			defaultValue={value}
			onBlur={event => onSetGrade(student.id, evaluation.id, event.target.value)}
			type="number" inputMode="decimal" min={course.scaleMin} max={course.scaleMax} step="0.01" placeholder="—"
			className={`rounded-lg border border-slate-200 px-2 text-center disabled:opacity-50 ${className}`}
		/>
	);
}

function GradedCount({ item }) {
	if (item.upcoming) return <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-normal text-slate-400">Programada</span>;
	return <span className={`mt-0.5 block text-[11px] font-semibold normal-case tracking-normal ${item.complete ? 'text-teal' : 'text-[#987513]'}`}>{item.complete ? '✓ Completa' : `${item.graded}/${item.total} notas`}</span>;
}

function StatusBadge({ student }) {
	const active = student.active !== false;
	return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-[#e5f4f1] text-teal' : 'bg-[#fff0eb] text-coral'}`}>{active ? 'Activo' : 'Inactivo'}</span>;
}

// Conteo de anotaciones (+ positivas, − negativas, i informativas); abre la pestaña de anotaciones.
function AnnotationChips({ student, onOpen }) {
	const counts = annotationCounts(student);
	const types = Object.keys(ANNOTATION_TYPES).filter(key => counts[key]);
	return (
		<button onClick={() => onOpen(student.id, 'annotations')} title="Ver anotaciones" className="inline-flex items-center gap-1 text-[11px] font-bold">
			{types.length ? types.map(key => <span key={key} className={`rounded-full px-1.5 py-0.5 ${ANNOTATION_TYPES[key].badge}`}>{ANNOTATION_TYPES[key].short}{counts[key]}</span>) : <span className="text-slate-400">+ Anotación</span>}
		</button>
	);
}

function StandingBadge({ standing }) {
	const style = STANDINGS[standing.status];
	return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${style.badge}`}><span className={`h-2 w-2 rounded-full ${style.dot}`} />{style.label}</span>;
}

// Acumulada (lo que ya suma a la nota final) + promedio de lo rendido (proyección).
function FinalGrade({ standing, align = 'left' }) {
	return (
		<div className={align === 'center' ? 'text-center' : ''}>
			<p className="font-display text-lg font-bold leading-tight">{formatGrade(standing.accumulated)}</p>
			<p className="text-[11px] font-semibold text-slate-400" title="Promedio de las evaluaciones rendidas: nota final proyectada si mantiene su rendimiento">
				{standing.currentAverage == null ? 'Sin rendir' : `Prom. ${formatGrade(standing.currentAverage)}`}
			</p>
		</div>
	);
}

function EvaluationActions({ evaluation, readOnly, onShowStats, onEditEvaluation, onRemoveEvaluation, compact }) {
	const base = compact ? 'font-bold disabled:opacity-30' : 'rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 ring-slate-200 disabled:opacity-30';
	return (
		<>
			<button onClick={() => onShowStats(evaluation.id)} className={`${base} text-teal`}>Resultados</button>
			<button disabled={readOnly} onClick={() => onEditEvaluation(evaluation.id)} className={`${base} text-ink hover:text-teal`}>Editar</button>
			<button disabled={readOnly} onClick={() => onRemoveEvaluation(evaluation.id)} className={`${base} text-coral`}>Eliminar</button>
		</>
	);
}

function MobileEvaluations({ evaluations, progress, ...actions }) {
	if (!evaluations.length) return null;
	return (
		<div className="border-b border-slate-100 p-4 md:hidden">
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Evaluaciones</p>
			<ul className="space-y-2">
				{evaluations.map(evaluation => (
					<li key={evaluation.id} className="rounded-xl bg-paper px-3 py-2.5">
						<p className="truncate text-sm font-semibold">{evaluation.title}</p>
						<p className="text-xs text-teal">{evaluation.weight}% · {evaluation.type}{evaluation.date ? ` · ${evaluation.date}` : ''}</p>
						<GradedCount item={progress.byId[evaluation.id]} />
						<div className="mt-2 flex flex-wrap gap-1.5">
							<EvaluationActions evaluation={evaluation} {...actions} />
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function MobileStudentCards({ course, rows, readOnly, onSetGrade, onEditStudent, onRemoveStudent }) {
	return (
		<ul className="divide-y divide-slate-100 md:hidden">
			{rows.map(({ student, standing, messages }) => (
				<li key={student.id} className="p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<button onClick={() => onEditStudent(student.id)} className="text-left font-semibold leading-tight hover:text-teal">{student.name}</button>
							<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
								<span>{student.rut || 'RUT no registrado'}</span>
								{student.active === false ? <StatusBadge student={student} /> : <StandingBadge standing={standing} />}
								<AnnotationChips student={student} onOpen={onEditStudent} />
								<button disabled={readOnly} onClick={() => onRemoveStudent(student.id)} className="font-bold text-coral disabled:opacity-30">Retirar</button>
							</div>
						</div>
						<div className="shrink-0 rounded-xl bg-paper px-3 py-1.5">
							<p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">Acumulada</p>
							<FinalGrade standing={standing} align="center" />
						</div>
					</div>
					{student.active !== false && (
						<div className="mt-2 text-xs">
							<p className={`font-semibold ${STANDINGS[standing.status].text}`}>{messages.need}</p>
							<p className="text-slate-400">{messages.summary}</p>
						</div>
					)}
					{course.evaluations.length > 0 && (
						<div className="mt-3 grid grid-cols-2 gap-2">
							{course.evaluations.map(evaluation => (
								<label key={evaluation.id} className="block min-w-0">
									<span className="block truncate text-xs text-slate-500">{evaluation.title} <span className="text-teal">({evaluation.weight}%)</span></span>
									{/* text-base evita el zoom automático de iOS al enfocar el input */}
									<GradeInput course={course} student={student} evaluation={evaluation} readOnly={readOnly} onSetGrade={onSetGrade} className="mt-1 h-11 w-full text-base" />
								</label>
							))}
						</div>
					)}
				</li>
			))}
		</ul>
	);
}

function matchesFilter(row, filter) {
	if (filter === 'all') return true;
	if (filter === 'inactive') return row.student.active === false;
	return row.student.active !== false && row.standing.status === filter;
}

export default function GradebookView({ course, courses, readOnly, initialFilter = 'all', onSelectCourse, onAddEvaluation, onAddStudent, onSetGrade, onEditStudent, onRemoveStudent, onEditEvaluation, onRemoveEvaluation }) {
	const [filter, setFilter] = useState(initialFilter);
	const [query, setQuery] = useState('');
	const [statsEvaluationId, setStatsEvaluationId] = useState(null);

	if (!course) {
		return <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-display text-lg font-bold">No hay cursos en esta institución.</p></div>;
	}
	const progress = courseProgress(course);
	const weightFull = progress.plannedWeight >= MAX_TOTAL_WEIGHT;
	const allRows = sortStudents(course.students).map(student => {
		const standing = studentStanding(course, student.id);
		return { student, standing, messages: standingMessages(standing) };
	});
	const counts = Object.fromEntries(FILTERS.map(item => [item.key, allRows.filter(row => matchesFilter(row, item.key)).length]));
	const search = query.trim().toLowerCase();
	const rows = allRows.filter(row => matchesFilter(row, filter) && (!search || row.student.name.toLowerCase().includes(search) || String(row.student.rut || '').toLowerCase().includes(search)));
	const statsEvaluation = course.evaluations.find(item => item.id === statsEvaluationId);
	const evaluationActions = { readOnly, onShowStats: setStatsEvaluationId, onEditEvaluation, onRemoveEvaluation };

	return (
		<section className="fade-up">
			<div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-center sm:gap-4">
				<label className="block min-w-0 sm:hidden">
					<span className="text-sm text-slate-400">Curso seleccionado ({courses.length})</span>
					<select value={course.id} onChange={event => onSelectCourse(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold">
						{courses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
					</select>
				</label>
				<p className="hidden text-sm text-slate-400 sm:block">Selecciona un curso ({courses.length})</p>
				<button disabled={readOnly || weightFull} title={weightFull ? 'La ponderación del curso ya suma 100%' : undefined} onClick={onAddEvaluation} className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:py-2.5">+ Nueva evaluación</button>
			</div>
			<CourseTabs courses={courses} selectedCourseId={course.id} onSelectCourse={onSelectCourse} />
			<div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
				<div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:p-5">
					<div>
						<h2 className="font-display text-xl font-bold">{course.name}</h2>
						<p className="mt-1 text-sm text-slate-400">{course.students.length} estudiantes · escala {course.scaleMin.toFixed(1)}–{course.scaleMax.toFixed(1)} · aprueba con {formatGrade(passingGrade(course))}</p>
						<CourseProgressBar progress={progress} className="mt-3 max-w-xl" />
					</div>
					<button disabled={readOnly} onClick={onAddStudent} className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-ink hover:border-teal hover:text-teal disabled:opacity-50 sm:py-2">+ Estudiante</button>
				</div>
				<MobileEvaluations evaluations={course.evaluations} progress={progress} {...evaluationActions} />
				<StudentFilters filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} counts={counts} />
				{rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Ningún estudiante coincide con el filtro seleccionado.</p>}
				<MobileStudentCards course={course} rows={rows} readOnly={readOnly} onSetGrade={onSetGrade} onEditStudent={onEditStudent} onRemoveStudent={onRemoveStudent} />
				{rows.length > 0 && (
					<div className="hidden overflow-x-auto gradebook-scroll md:block">
						<table className="w-full text-left text-sm">
							<thead className="bg-paper text-xs uppercase tracking-wider text-slate-400">
								<tr>
									<th className="sticky left-0 z-10 bg-paper px-5 py-4 font-semibold">Estudiante</th>
									{course.evaluations.map(evaluation => (
										<th key={evaluation.id} className="min-w-32 px-3 py-4 font-semibold">
											<span>{evaluation.title}<small className="mt-1 block normal-case tracking-normal text-teal">{evaluation.weight}% · {evaluation.type}</small></span>
											<GradedCount item={progress.byId[evaluation.id]} />
											<div className="mt-1 flex flex-wrap gap-x-3 normal-case tracking-normal">
												<EvaluationActions evaluation={evaluation} {...evaluationActions} compact />
											</div>
										</th>
									))}
									<th className="px-3 py-4 font-semibold">Acumulada</th>
									<th className="min-w-56 px-3 py-4 font-semibold">Situación</th>
								</tr>
							</thead>
							<tbody>
								{rows.map(({ student, standing, messages }) => (
									<tr key={student.id} className="border-t border-slate-100">
										<td className="sticky left-0 z-10 min-w-56 bg-white px-5 py-3 font-semibold">
											<button onClick={() => onEditStudent(student.id)} className="text-left hover:text-teal">{student.name}</button>
											<span className="mt-1 block text-xs font-normal text-slate-400">{student.rut || 'RUT no registrado'}</span>
											<span className="mt-1 inline-flex items-center gap-2">
												<StatusBadge student={student} />
												<AnnotationChips student={student} onOpen={onEditStudent} />
												<button disabled={readOnly} onClick={() => onRemoveStudent(student.id)} className="text-xs font-bold text-coral disabled:opacity-30">Retirar</button>
											</span>
										</td>
										{course.evaluations.map(evaluation => (
											<td key={evaluation.id} className="px-3 py-3">
												<GradeInput course={course} student={student} evaluation={evaluation} readOnly={readOnly} onSetGrade={onSetGrade} className="h-9 w-20" />
											</td>
										))}
										<td className="px-3 py-3"><FinalGrade standing={standing} /></td>
										<td className="px-3 py-3 text-xs">
											{student.active === false ? <span className="text-slate-400">Retirado</span> : (
												<>
													<StandingBadge standing={standing} />
													<p className={`mt-1 font-semibold ${STANDINGS[standing.status].text}`}>{messages.need}</p>
													<p className="text-slate-400">{messages.summary}</p>
												</>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
			{statsEvaluation && <EvaluationStatsModal course={course} evaluation={statsEvaluation} onClose={() => setStatsEvaluationId(null)} />}
		</section>
	);
}

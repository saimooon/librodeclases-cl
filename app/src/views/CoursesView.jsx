import { colorClasses, courseProgress } from '../lib/domain';
import CourseProgressBar from '../components/CourseProgressBar';

export default function CoursesView({ institution, courses, selectedCourseId, readOnly, onAddInstitution, onAddCourse, onEditCourse, onRemoveCourse, onOpenCourse }) {
	return (
		<section className="fade-up">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-slate-400">{institution?.name} · crea cursos predeterminados o personalizados</p>
				<div className="flex w-full gap-2 sm:w-auto">
					<button onClick={onAddInstitution} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-ink">+ Institución</button>
					<button disabled={readOnly} onClick={onAddCourse} className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">+ Curso</button>
				</div>
			</div>
			<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
				{courses.length === 0 && (
					<div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
						<p className="font-display text-lg font-bold">No hay cursos creados todavía.</p>
						<button disabled={readOnly} onClick={onAddCourse} className="mt-4 rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Crear ahora</button>
					</div>
				)}
				{courses.map(item => {
					const progress = courseProgress(item);
					return (
					<div key={item.id} className={`rounded-2xl border ${item.id === selectedCourseId ? 'border-teal/40 ring-2 ring-teal/10' : 'border-slate-200/80'} bg-white p-5 shadow-sm`}>
						<div className="mb-4 flex items-start justify-between">
							<span className={`grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold ${colorClasses(item.color)}`}>{item.name.split(' ')[0]}</span>
							<div className="flex gap-2">
								<button disabled={readOnly} onClick={() => onEditCourse(item.id)} className="text-xs font-bold text-teal disabled:opacity-50">Editar</button>
								<button disabled={readOnly} onClick={() => onRemoveCourse(item.id)} className="text-xs font-bold text-coral disabled:opacity-50">Eliminar</button>
							</div>
						</div>
						<h2 className="font-display text-xl font-bold">{item.name}</h2>
						<p className="mt-1 text-sm text-slate-400">{item.level} {item.letter ? `· Letra ${item.letter}` : ''}</p>
						<div className="mt-4">
							<div className="mb-1.5 flex justify-between text-xs">
								<span className="font-semibold text-slate-500">Avance: {progress.completedWeight}% calificado</span>
								<span className="text-slate-400">{progress.pendingGrades ? `${progress.pendingGrades} notas pendientes` : item.evaluations.length ? 'Al día' : 'Sin evaluaciones'}</span>
							</div>
							<CourseProgressBar progress={progress} compact />
						</div>
						<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
							<span className="text-slate-500">{item.students.length} estudiantes</span>
							<button onClick={() => onOpenCourse(item.id)} className="font-bold text-teal">Abrir notas →</button>
						</div>
					</div>
					);
				})}
			</div>
		</section>
	);
}

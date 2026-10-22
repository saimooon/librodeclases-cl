import { MAX_TOTAL_WEIGHT } from '../lib/domain';

// Barra apilada sobre el 100% de la nota final: calificado / creado sin calificar / sin evaluación creada.
export default function CourseProgressBar({ progress, compact = false, className = '' }) {
	const exceeded = progress.plannedWeight > MAX_TOTAL_WEIGHT;
	const segments = [
		{ key: 'done', value: progress.completedWeight, color: 'bg-teal', label: 'Calificado' },
		{ key: 'pending', value: progress.pendingWeight, color: 'bg-sun', label: 'Por calificar' },
		{ key: 'unplanned', value: progress.unplannedWeight, color: 'bg-slate-200', label: 'Sin evaluación creada' },
	];
	return (
		<div className={className}>
			<div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Avance: ${progress.completedWeight}% calificado, ${progress.pendingWeight}% por calificar, ${progress.unplannedWeight}% sin evaluación`}>
				{segments.map(segment => segment.value > 0 && <div key={segment.key} className={`h-full ${segment.color}`} style={{ width: `${(Math.min(segment.value, MAX_TOTAL_WEIGHT) / Math.max(progress.plannedWeight, MAX_TOTAL_WEIGHT)) * 100}%` }} />)}
			</div>
			{!compact && (
				<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
					{segments.map(segment => (
						<span key={segment.key} className="inline-flex items-center gap-1.5">
							<span className={`h-2 w-2 rounded-full ${segment.color}`} /> {segment.label}: <strong>{segment.value}%</strong>
						</span>
					))}
					{progress.pendingGrades > 0 && <span>· {progress.pendingGrades} nota(s) pendiente(s)</span>}
				</div>
			)}
			{exceeded && <p className="mt-2 text-xs font-semibold text-coral">La ponderación suma {progress.plannedWeight}% y supera el 100%: ajusta las evaluaciones.</p>}
		</div>
	);
}

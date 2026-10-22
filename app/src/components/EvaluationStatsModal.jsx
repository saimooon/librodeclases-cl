import Modal from './Modal';
import { displayDate, evaluationStats, formatGrade } from '../lib/domain';

// Lectura rápida de la forma del histograma para detectar pruebas muy difíciles o muy fáciles.
function calibrationHint(stats) {
	if (stats.count < 5) return null;
	if (stats.passRate < 40) return { tone: 'text-coral', text: 'Aprobación baja: revisa si la evaluación fue muy difícil o si conviene reforzar contenidos.' };
	if (stats.passRate === 100 && stats.min >= stats.pass + 1.5) return { tone: 'text-[#987513]', text: 'Todos con notas altas: la evaluación podría no estar diferenciando niveles de logro.' };
	return { tone: 'text-teal', text: 'Distribución dentro de lo esperado.' };
}

export default function EvaluationStatsModal({ course, evaluation, onClose }) {
	const stats = evaluationStats(course, evaluation.id);
	const highest = Math.max(1, ...stats.bins.map(bin => bin.count));
	const hint = calibrationHint(stats);

	return (
		<Modal labelledBy="evaluation-stats-title" onClose={onClose} maxWidth="sm:max-w-lg">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h2 id="evaluation-stats-title" className="font-display text-xl font-bold">{evaluation.title}</h2>
						<p className="mt-1 text-sm text-slate-400">{course.name} · {evaluation.weight}% · {evaluation.type} · {displayDate(evaluation.date)}</p>
					</div>
					<button type="button" aria-label="Cerrar" onClick={onClose} className="text-2xl text-slate-400">×</button>
				</div>

				{stats.count === 0 ? (
					<p className="rounded-xl bg-paper p-4 text-sm text-slate-500">Aún no hay notas registradas en esta evaluación. Cuando ingreses notas verás aquí el promedio, la distribución y el porcentaje de aprobación.</p>
				) : (
					<>
						<dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<Stat label="Promedio" value={formatGrade(stats.average)} />
							<Stat label="Mínima" value={formatGrade(stats.min)} />
							<Stat label="Máxima" value={formatGrade(stats.max)} />
							<Stat label="Aprobación" value={`${stats.passRate}%`} hint={`${stats.passed}/${stats.count} con ${formatGrade(stats.pass)} o más`} />
						</dl>

						<h3 className="mt-5 text-sm font-semibold">Distribución de notas</h3>
						<ul className="mt-2 space-y-1.5">
							{stats.bins.map(bin => (
								<li key={bin.label} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-xs">
									<span className="font-semibold text-slate-500">{bin.label}</span>
									<span className="h-5 overflow-hidden rounded-md bg-slate-100">
										<span className={`block h-full rounded-md ${bin.belowPass ? 'bg-coral' : 'bg-teal'}`} style={{ width: `${(bin.count / highest) * 100}%` }} />
									</span>
									<span className="text-right font-bold">{bin.count}</span>
								</li>
							))}
						</ul>
						<p className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-400">
							<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-coral" /> Bajo {formatGrade(stats.pass)}</span>
							<span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal" /> Aprobado</span>
						</p>
						{hint && <p className={`mt-4 text-sm font-semibold ${hint.tone}`}>{hint.text}</p>}
					</>
				)}

				<p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
					Notas registradas: {stats.count}/{stats.total} estudiantes{stats.count > 0 && stats.count < stats.total ? ' · resultado parcial' : ''}
				</p>
		</Modal>
	);
}

function Stat({ label, value, hint }) {
	return (
		<div className="rounded-xl bg-paper px-3 py-2.5">
			<dt className="text-xs text-slate-400">{label}</dt>
			<dd className="font-display text-xl font-bold">{value}</dd>
			{hint && <dd className="text-[11px] leading-tight text-slate-400">{hint}</dd>}
		</div>
	);
}

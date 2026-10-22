import { useState } from 'react';
import Modal from './Modal';
import { ANNOTATION_TYPES, dateToComparable, dateToInput, displayDate } from '../lib/domain';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm';
const todayInput = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Ficha del estudiante: datos personales/apoderado (se guardan con "Guardar")
// y anotaciones (se guardan al instante al agregar o eliminar).
export default function StudentRecordModal({ student, forceRetire, initialTab = 'data', readOnly, onClose, onSave, onAddAnnotation, onRemoveAnnotation }) {
	const [tab, setTab] = useState(forceRetire ? 'data' : initialTab);
	const [form, setForm] = useState({
		name: student.name,
		rut: student.rut || '',
		age: student.age ?? '',
		guardianName: student.guardianName || '',
		guardianEmail: student.guardianEmail || '',
		status: forceRetire || student.active === false ? 'inactive' : 'active',
		ingreso: dateToInput(student.ingreso),
		retiro: dateToInput(student.retiro),
	});
	const field = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
	const annotations = [...(student.annotations || [])].sort((first, second) => dateToComparable(second.date).localeCompare(dateToComparable(first.date)));

	function handleSubmit(event) {
		event.preventDefault();
		onSave(form);
	}

	return (
		<Modal labelledBy="student-record-title" onClose={onClose} maxWidth="sm:max-w-lg">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h2 id="student-record-title" className="font-display text-xl font-bold">{forceRetire ? 'Retirar estudiante' : student.name}</h2>
						<p className="mt-1 text-sm text-slate-400">{forceRetire ? `Registra el retiro de ${student.name}` : 'Ficha del estudiante'}</p>
					</div>
					<button type="button" aria-label="Cerrar" onClick={onClose} className="text-2xl text-slate-400">×</button>
				</div>
				{!forceRetire && (
					<div className="mb-4 grid grid-cols-2 rounded-xl bg-paper p-1 text-sm font-bold" role="tablist">
						{[['data', 'Datos'], ['annotations', `Anotaciones (${annotations.length})`]].map(([key, label]) => (
							<button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 ${tab === key ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>{label}</button>
						))}
					</div>
				)}

				{tab === 'data' ? (
					<form onSubmit={handleSubmit} className="space-y-4">
						<Field label="Nombre completo">
							<input required value={form.name} onChange={field('name')} className={inputClass} />
						</Field>
						<div className="grid grid-cols-[1fr_6rem] gap-3">
							<Field label="RUT" optional>
								<input value={form.rut} onChange={field('rut')} className={inputClass} />
							</Field>
							<Field label="Edad" optional>
								<input type="number" inputMode="numeric" min="1" max="120" step="1" value={form.age} onChange={field('age')} className={inputClass} />
							</Field>
						</div>
						<fieldset className="rounded-xl border border-slate-200 p-3">
							<legend className="px-1 text-sm font-semibold">Apoderado <span className="font-normal text-slate-400">(opcional)</span></legend>
							<div className="space-y-3">
								<Field label="Nombre">
									<input value={form.guardianName} onChange={field('guardianName')} autoComplete="off" className={inputClass} />
								</Field>
								<Field label="Correo">
									<input type="email" value={form.guardianEmail} onChange={field('guardianEmail')} autoComplete="off" placeholder="apoderado@correo.cl" className={inputClass} />
								</Field>
							</div>
						</fieldset>
						<Field label="Estado">
							<select value={form.status} onChange={field('status')} className={inputClass}>
								<option value="active">Activo</option>
								<option value="inactive">Inactivo</option>
							</select>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Ingreso" optional>
								<input type="date" value={form.ingreso} onChange={field('ingreso')} className={inputClass} />
							</Field>
							<Field label="Retiro" optional>
								<input type="date" value={form.retiro} onChange={field('retiro')} className={inputClass} />
							</Field>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button>
							<button type="submit" disabled={readOnly} className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar</button>
						</div>
					</form>
				) : (
					<Annotations annotations={annotations} readOnly={readOnly} onAdd={onAddAnnotation} onRemove={onRemoveAnnotation} />
				)}
		</Modal>
	);
}

function Annotations({ annotations, readOnly, onAdd, onRemove }) {
	const [draft, setDraft] = useState({ type: 'positive', date: todayInput(), comment: '' });

	function handleSubmit(event) {
		event.preventDefault();
		if (onAdd(draft) !== false) setDraft(current => ({ ...current, comment: '' }));
	}

	return (
		<div className="space-y-4">
			<form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-paper p-3">
				<div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de anotación">
					{Object.entries(ANNOTATION_TYPES).map(([key, item]) => (
						<button key={key} type="button" role="radio" aria-checked={draft.type === key} onClick={() => setDraft({ ...draft, type: key })} className={`rounded-lg px-2 py-2 text-xs font-bold ring-1 ${draft.type === key ? `${item.badge} ring-current` : 'bg-white text-slate-500 ring-slate-200'}`}>
							{item.label}
						</button>
					))}
				</div>
				<Field label="Fecha">
					<input type="date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} className={inputClass} />
				</Field>
				<Field label="Comentario">
					<textarea required maxLength={1000} rows={3} value={draft.comment} onChange={event => setDraft({ ...draft, comment: event.target.value })} placeholder="Describe la situación observada" className={`${inputClass} resize-y`} />
				</Field>
				<button type="submit" disabled={readOnly || !draft.comment.trim()} className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Agregar anotación</button>
			</form>

			{annotations.length === 0 ? (
				<p className="text-center text-sm text-slate-400">Sin anotaciones registradas.</p>
			) : (
				<ul className="space-y-2">
					{annotations.map(item => {
						const type = ANNOTATION_TYPES[item.type] || ANNOTATION_TYPES.info;
						return (
							<li key={item.id} className="rounded-xl border border-slate-100 p-3">
								<div className="flex items-center justify-between gap-2">
									<span className="flex items-center gap-2">
										<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${type.badge}`}>{type.label}</span>
										<span className="text-xs text-slate-400">{displayDate(item.date)}</span>
									</span>
									<button type="button" disabled={readOnly} onClick={() => onRemove(item.id)} className="text-xs font-bold text-coral disabled:opacity-30">Eliminar</button>
								</div>
								<p className="mt-2 whitespace-pre-line break-words text-sm">{item.comment}</p>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function Field({ label, optional, children }) {
	return (
		<label className="block min-w-0">
			<span className="mb-1.5 block text-sm font-semibold">{label}{optional && <span className="font-normal text-slate-400"> (opcional)</span>}</span>
			{children}
		</label>
	);
}

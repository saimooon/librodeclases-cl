import { useState } from 'react';
import { levels, letters } from '../lib/domain';
import Modal from './Modal';

export default function EntityModal({ type, editing, availableWeight, onClose, onSubmit }) {
	const [form, setForm] = useState(() => defaultForm(type, editing, availableWeight));
	const weightExceeded = type === 'evaluation' && Number(form.weight) > availableWeight;

	const titles = { institution: editing ? 'Editar institución' : 'Nueva institución', course: editing ? 'Editar curso' : 'Nuevo curso', student: editing ? 'Editar estudiante' : 'Agregar estudiante', evaluation: editing ? 'Editar evaluación' : 'Nueva evaluación' };

	function handleSubmit(event) {
		event.preventDefault();
		onSubmit(form);
	}

	return (
		<Modal labelledBy="entity-modal-title" onClose={onClose} maxWidth="sm:max-w-md">
				<div className="mb-5 flex items-start justify-between">
					<h2 id="entity-modal-title" className="font-display text-xl font-bold">{titles[type]}</h2>
					<button type="button" aria-label="Cerrar" onClick={onClose} className="text-2xl text-slate-400">×</button>
				</div>
				<form onSubmit={handleSubmit} className="space-y-4">
					{type === 'institution' && (
						<>
							<Field label="Nombre">
								<input required value={form.name} onChange={update(setForm, 'name')} placeholder="Colegio, liceo o universidad" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
							</Field>
							<Field label="Tipo">
								<select value={form.type} onChange={update(setForm, 'type')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
									{['Colegio', 'Liceo', 'Universidad', 'Instituto', 'Otro'].map(item => <option key={item}>{item}</option>)}
								</select>
							</Field>
						</>
					)}
					{type === 'course' && (
						<>
							<Field label="Nivel predeterminado">
								<select value={form.level} onChange={update(setForm, 'level')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
									<option value="custom">Personalizado</option>
									{levels.map(item => <option key={item}>{item}</option>)}
								</select>
							</Field>
							<Field label="Letra">
								<select value={form.letter} onChange={update(setForm, 'letter')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
									<option value="">Sin letra</option>
									{letters.map(item => <option key={item}>{item}</option>)}
								</select>
							</Field>
							<Field label="Nombre personalizado (opcional)">
								<input value={form.customName} onChange={update(setForm, 'customName')} placeholder="Deja vacío para usar nivel + letra" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
							</Field>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Escala mínima">
									<input type="number" step="0.01" value={form.scaleMin} onChange={update(setForm, 'scaleMin')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
								</Field>
								<Field label="Escala máxima">
									<input type="number" step="0.01" value={form.scaleMax} onChange={update(setForm, 'scaleMax')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
								</Field>
							</div>
							<Field label="Nota de aprobación">
								<input type="number" inputMode="decimal" step="0.1" value={form.passingGrade} onChange={update(setForm, 'passingGrade')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
								<span className="mt-1 block text-xs text-slate-400">Se usa para detectar estudiantes en riesgo y calcular la nota que necesitan.</span>
							</Field>
						</>
					)}
					{type === 'student' && (
						<Field label="Nombre completo">
							<input required value={form.name} onChange={update(setForm, 'name')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
						</Field>
					)}
					{type === 'evaluation' && (
						<>
							<Field label="Título">
								<input required value={form.title} onChange={update(setForm, 'title')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
							</Field>
							<Field label="Fecha">
								<input type="date" required value={form.date} onChange={update(setForm, 'date')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
							</Field>
							<div className="grid grid-cols-2 gap-3">
								<Field label="Ponderación (%)">
									<input type="number" required inputMode="decimal" min="0.01" max={availableWeight} step="0.01" value={form.weight} onChange={update(setForm, 'weight')} className={`w-full rounded-xl border px-3 py-2.5 ${weightExceeded ? 'border-coral' : 'border-slate-200'}`} />
								</Field>
								<Field label="Tipo">
									<select value={form.evaluationType} onChange={update(setForm, 'evaluationType')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
										{['Prueba', 'Quiz', 'Oral', 'Proyecto', 'Participación', 'Otro'].map(item => <option key={item}>{item}</option>)}
									</select>
								</Field>
							</div>
							<p className={`text-xs ${weightExceeded ? 'font-semibold text-coral' : 'text-slate-400'}`}>
								{weightExceeded ? `Supera el 100% del curso. ` : ''}Disponible para esta evaluación: {availableWeight}%
							</p>
						</>
					)}
					<div className="flex justify-end gap-2 pt-2">
						<button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancelar</button>
						<button type="submit" disabled={weightExceeded} className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar</button>
					</div>
				</form>
		</Modal>
	);
}

function Field({ label, children }) {
	return (
		<label className="block">
			<span className="mb-1.5 block text-sm font-semibold">{label}</span>
			{children}
		</label>
	);
}

function update(setForm, key) {
	return event => setForm(form => ({ ...form, [key]: event.target.value }));
}

function defaultForm(type, editing, availableWeight) {
	if (type === 'institution') return { name: editing?.name || '', type: editing?.type || 'Colegio' };
	if (type === 'course') return { level: editing?.level && editing.level !== 'Personalizado' ? editing.level : 'custom', letter: editing?.letter || '', customName: editing?.level === 'Personalizado' ? editing?.name || '' : '', scaleMin: editing?.scaleMin ?? 1, scaleMax: editing?.scaleMax ?? 7, passingGrade: editing?.passingGrade ?? 4 };
	if (type === 'student') return { name: editing?.name || '' };
	return { title: editing?.title || '', date: editing?.date ? editing.date.split('/').reverse().join('-') : '', weight: editing?.weight ?? Math.min(10, availableWeight ?? 10), evaluationType: editing?.type || 'Prueba' };
}

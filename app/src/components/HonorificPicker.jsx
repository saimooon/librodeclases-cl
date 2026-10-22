import { HONORIFIC_OPTIONS } from '../lib/domain';

// Selector de tratamiento (Profesora / Profesor / Profe) según el género declarado.
export default function HonorificPicker({ value, onChange }) {
	return (
		<div className="grid grid-cols-3 gap-2">
			{HONORIFIC_OPTIONS.map(option => (
				<button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`rounded-xl px-2 py-2 text-center text-sm font-bold ring-1 ${value === option.value ? 'course-tab-active bg-ink text-white ring-ink' : 'bg-white text-ink ring-slate-200'}`}>
					{option.label}
					<span className="block text-[11px] font-medium opacity-70">{option.hint}</span>
				</button>
			))}
		</div>
	);
}

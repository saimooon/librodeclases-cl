export default function InstitutionsView({ institutions, selectedInstitutionId, onAddInstitution, onEditInstitution, onRemoveInstitution, onOpenInstitution }) {
	return (
		<section className="fade-up">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-slate-400">Administra todos los colegios, liceos y universidades</p>
				<button onClick={onAddInstitution} className="rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white">+ Institución</button>
			</div>
			<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
				{institutions.map(item => (
					<div key={item.id} className={`rounded-2xl border ${item.id === selectedInstitutionId ? 'border-teal/40 ring-2 ring-teal/10' : 'border-slate-200/80'} bg-white p-5 shadow-sm`}>
						<div className="mb-4 flex items-start justify-between">
							<span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e5f4f1] text-xl text-teal">▣</span>
							<div className="flex gap-2">
								<button onClick={() => onEditInstitution(item.id)} className="text-xs font-bold text-teal">Editar</button>
								<button onClick={() => onRemoveInstitution(item.id)} className="text-xs font-bold text-coral">Eliminar</button>
							</div>
						</div>
						<h2 className="font-display text-xl font-bold">{item.name}</h2>
						<p className="mt-1 text-sm text-slate-400">{item.type} · {item.courses.length} cursos</p>
						<button onClick={() => onOpenInstitution(item.id)} className="mt-5 w-full rounded-xl bg-paper px-3 py-2.5 text-sm font-bold text-ink">Gestionar cursos →</button>
					</div>
				))}
			</div>
		</section>
	);
}

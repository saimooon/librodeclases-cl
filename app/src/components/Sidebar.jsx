import BrandLogo from './BrandLogo';

const NAV = [
	{ key: 'dashboard', label: 'Resumen', short: 'Resumen', icon: '⌂' },
	{ key: 'grades', label: 'Libro de notas', short: 'Notas', icon: '▦' },
	{ key: 'calendar', label: 'Calendario', short: 'Calendario', icon: '◷' },
	{ key: 'courses', label: 'Cursos', short: 'Cursos', icon: '♧' },
	{ key: 'institutions', label: 'Instituciones', short: 'Instituciones', icon: '▣' },
];

export default function Sidebar({ institutions, selectedInstitutionId, onSelectInstitution, view, onSetView, onLogout }) {
	return (
		<aside className="hidden w-72 shrink-0 border-r border-slate-200/80 bg-white/80 px-5 py-7 lg:flex lg:flex-col">
			<div className="mb-8 px-2">
				<BrandLogo className="mx-auto h-auto w-44" />
			</div>
			<label className="mb-6 block px-2">
				<span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Institución activa</span>
				<select value={selectedInstitutionId} onChange={event => onSelectInstitution(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">
					{institutions.map(item => (
						<option key={item.id} value={item.id}>{item.name}</option>
					))}
				</select>
			</label>
			<nav className="space-y-2">
				{NAV.map(item => (
					<button key={item.key} onClick={() => onSetView(item.key)} className={`${view === item.key ? 'nav-active' : 'text-slate-500 hover:bg-slate-50'} flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold`}>
						<span className="text-lg">{item.icon}</span> {item.label}
					</button>
				))}
			</nav>
			<button onClick={onLogout} className="mt-auto rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-400 hover:bg-slate-50">Cerrar sesión</button>
		</aside>
	);
}

export function MobileNav({ view, onSetView }) {
	return (
		<nav className="mobile-nav fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-soft backdrop-blur lg:hidden">
			{NAV.map(item => (
				<button key={item.key} aria-current={view === item.key ? 'page' : undefined} onClick={() => onSetView(item.key)} className={`min-w-0 rounded-xl px-0.5 py-2 text-center text-[10px] font-semibold sm:text-[11px] ${view === item.key ? 'nav-active' : ''}`}>
					<span className="block text-lg">{item.icon}</span><span className="block truncate">{item.short}</span>
				</button>
			))}
		</nav>
	);
}

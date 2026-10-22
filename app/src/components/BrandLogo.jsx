// Logo de Libro de Clases.cl. "full" = ícono + "Libro de Clases.cl · Soluciones para Docentes"; "mark" = solo el ícono.
// El ícono incluye la versión blanca para modo oscuro (se alterna por CSS con .brand-light / .brand-dark);
// el nombre va como texto para que se adapte solo al tema.
function BrandMark({ className = '' }) {
	return (
		<>
			<img src="/brand/logo-mark.png" alt="Libro de Clases.cl" className={`brand-light ${className}`} />
			<img src="/brand/logo-mark-white.png" alt="Libro de Clases.cl" className={`brand-dark ${className}`} />
		</>
	);
}

export default function BrandLogo({ variant = 'full', className = '' }) {
	if (variant === 'mark') return <BrandMark className={className} />;
	return (
		<div className={`flex flex-col items-center text-center ${className}`}>
			<BrandMark className="h-auto w-3/5" />
			<p className="mt-2 whitespace-nowrap font-display text-xl font-bold leading-none text-ink">
				Libro de Clases<span className="text-teal">.cl</span>
			</p>
			<p className="mt-1 text-xs font-semibold text-slate-500">Soluciones para Docentes</p>
		</div>
	);
}

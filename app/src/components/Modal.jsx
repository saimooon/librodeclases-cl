import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Contenedor común de modales. Se renderiza en <body> (portal) para que ningún ancestro con transform
// (p. ej. la animación .fade-up) lo desplace: siempre queda fijo al viewport.
// En móvil se muestra como hoja inferior; desde sm, centrado.
export default function Modal({ labelledBy, onClose, maxWidth = 'max-w-md', children }) {
	useEffect(() => {
		const handleKey = event => { if (event.key === 'Escape') onClose(); };
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', handleKey);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', handleKey);
		};
	}, [onClose]);

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
			<div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`modal-panel max-h-[92dvh] w-full ${maxWidth} overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-soft sm:max-h-[90vh] sm:rounded-2xl sm:p-6`}>
				<div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
				{children}
			</div>
		</div>,
		document.body,
	);
}

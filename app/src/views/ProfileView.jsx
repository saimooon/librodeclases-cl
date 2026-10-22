import { useState } from 'react';
import * as XLSX from 'xlsx';
import { ANNOTATION_COLUMNS, displayDate, EXPORT_COLUMNS } from '../lib/domain';
import { downloadBlob } from '../lib/download';
import { useTheme } from '../context/ThemeContext';
import ProfileEditForm from '../components/ProfileEditForm';
import HonorificPicker from '../components/HonorificPicker';

function initials(name) {
	if (!name) return '?';
	return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

const SAMPLE_ROSTER = {
	ano_escolar: 2026,
	profesora_asignatura: { nombre: 'NOMBRE PROFESORA', asignatura: 'Asignatura' },
	total_cursos: 1,
	cursos: [
		{
			hoja: '1°',
			curso: '1 º "A" 2026',
			profesor_jefe: 'NOMBRE PROFESOR(A) JEFE',
			estudiantes: [
				{ n_orden: 1, n_matricula: null, run: '11111111-1', nombre_completo: 'APELLIDO APELLIDO NOMBRE NOMBRE', ingreso: null, retiro: null },
				{ n_orden: 2, n_matricula: null, run: '22222222-2', nombre_completo: 'APELLIDO APELLIDO NOMBRE NOMBRE', ingreso: null, retiro: null },
			],
		},
	],
};

// Plantillas con las mismas columnas del export (las columnas calculadas se ignoran al importar).
const SAMPLE_ROWS = [
	{ Institucion: 'Mi Colegio', 'Tipo institucion': 'Colegio', Curso: '1º Básico A', Nivel: '1º Básico', Letra: 'A', 'Escala minima': 1, 'Escala maxima': 7, 'Nota aprobacion': 4, Color: 'teal', Estudiante: 'Nombre Apellido', RUT: '11111111-1', Estado: 'Activo', Ingreso: '01/03/2026', Retiro: '', Edad: 7, Apoderado: 'Nombre Apoderado', 'Correo apoderado': 'apoderado@correo.cl', Evaluacion: 'Prueba 1', Fecha: '01/04/2026', Ponderacion: 20, 'Tipo evaluacion': 'Prueba', Nota: 6.5 },
];
const SAMPLE_ANNOTATIONS = [
	{ Institucion: 'Mi Colegio', Curso: '1º Básico A', Estudiante: 'Nombre Apellido', RUT: '11111111-1', 'Tipo anotacion': 'Positiva', Fecha: '02/04/2026', Comentario: 'Excelente participación en clases.' },
];
const sampleSheet = () => XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: EXPORT_COLUMNS.filter(column => !['Nota acumulada', 'Promedio rendido', 'Situacion', 'Anotaciones'].includes(column)) });

export default function ProfileView({ teacher, user, demo, institutions, onExport, onImport, onSetHonorific }) {
	const [format, setFormat] = useState('csv');
	const [editing, setEditing] = useState(false);
	const [importMode, setImportMode] = useState('merge');
	const [honorificStatus, setHonorificStatus] = useState('');
	const { dark, toggleDark } = useTheme();
	const name = teacher?.displayName || user.displayName || 'Profesor(a)';
	const courses = institutions.reduce((sum, item) => sum + item.courses.length, 0);
	const students = institutions.reduce((sum, item) => sum + item.courses.reduce((count, course) => count + course.students.length, 0), 0);
	const evaluations = institutions.reduce((sum, item) => sum + item.courses.reduce((count, course) => count + course.evaluations.length, 0), 0);

	return (
		<section className="fade-up space-y-5">
			<div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						{teacher?.photoDataUrl ? (
							<img src={teacher.photoDataUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
						) : (
							<span className="grid h-16 w-16 place-items-center rounded-full bg-teal text-xl font-bold text-white">{initials(name)}</span>
						)}
						<div>
							<h2 className="font-display text-xl font-bold">{name}</h2>
							<p className="text-sm text-slate-500">{user.email || user.phoneNumber}</p>
						</div>
					</div>
					{!demo && <button onClick={() => setEditing(value => !value)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-ink hover:bg-slate-50">
						{editing ? 'Cerrar edición' : 'Editar perfil'}
					</button>}
				</div>
				<dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
					<div>
						<dt className="text-slate-400">Teléfono</dt>
						<dd className="font-semibold">{teacher?.phoneNumber || user.phoneNumber || '—'}</dd>
					</div>
					<div>
						<dt className="text-slate-400">Fecha de nacimiento</dt>
						<dd className="font-semibold">{teacher?.birthdate ? displayDate(teacher.birthdate.split('-').reverse().join('/')) : '—'}</dd>
					</div>
					<div>
						<dt className="text-slate-400">Miembro desde</dt>
						<dd className="font-semibold">{teacher?.createdAt?.toDate ? teacher.createdAt.toDate().toLocaleDateString('es-CL') : '—'}</dd>
					</div>
				</dl>
			</div>

			{editing && !demo && <ProfileEditForm teacher={teacher} user={user} onSaved={() => {}} />}

			<div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
				<h3 className="font-display text-lg font-bold">Ajustes</h3>
				<div className="mt-4 border-b border-slate-100 pb-4">
					<p className="text-sm font-semibold">¿Cómo quieres que te llamemos?</p>
					<p className="mb-3 text-xs text-slate-400">Según tu género o preferencia; se usa en saludos y mensajes, por ejemplo "Buenos días, Profesora María".</p>
					<div className="max-w-sm">
						<HonorificPicker value={teacher?.honorific || ''} onChange={async honorific => {
							setHonorificStatus('Guardando…');
							try { await onSetHonorific(honorific); setHonorificStatus('Preferencia guardada.'); } catch { setHonorificStatus('No se pudo guardar. Revisa tu conexión.'); }
						}} />
					</div>
					{honorificStatus && <p className="mt-2 text-xs font-semibold text-slate-500">{honorificStatus}</p>}
				</div>
				<div className="mt-4 flex items-center justify-between">
					<div>
						<p className="text-sm font-semibold">Tema oscuro</p>
						<p className="text-xs text-slate-400">Cambia la apariencia de toda la app.</p>
					</div>
					<button onClick={toggleDark} className={`h-8 w-14 rounded-full p-1 transition-colors ${dark ? 'bg-teal' : 'bg-slate-200'}`}>
						<span className={`block h-6 w-6 rounded-full bg-white transition-transform ${dark ? 'translate-x-6' : 'translate-x-0'}`} />
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
				<h3 className="font-display text-lg font-bold">Importar datos</h3>
				<p className="mt-1 text-sm text-slate-500">Sube una nómina (JSON), un respaldo de Libro de Clases.net (JSON, incluye todo) o una planilla CSV/Excel con el formato del export. En Excel, las anotaciones van en la hoja "Anotaciones"; el CSV no las incluye.</p>
				<div className="mt-4 flex flex-wrap items-center gap-2">
					<select value={importMode} onChange={event => setImportMode(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
						<option value="merge">Agregar como nueva institución</option>
						<option value="replace">Reemplazar todos mis datos</option>
					</select>
					<label className="cursor-pointer rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white hover:opacity-90">
						Seleccionar archivo
						<input
							type="file" accept=".json,.csv,.xlsx" className="hidden"
							onChange={event => {
								const file = event.target.files?.[0];
								if (!file) return;
								if (importMode === 'replace' && !confirm('Esto reemplazará todos tus datos actuales. ¿Continuar?')) { event.target.value = ''; return; }
								onImport(file, importMode);
								event.target.value = '';
							}}
						/>
					</label>
				</div>
				<div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
					<button onClick={() => downloadBlob(new Blob([JSON.stringify(SAMPLE_ROSTER, null, 2)], { type: 'application/json;charset=utf-8' }), 'plantilla-nomina.json')} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50">
						Descargar plantilla JSON (nómina)
					</button>
					<button onClick={() => { const sheet = sampleSheet(); downloadBlob(new Blob(['\ufeff' + XLSX.utils.sheet_to_csv(sheet)], { type: 'text/csv;charset=utf-8' }), 'plantilla-librodeclases.csv'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50">
						Descargar plantilla CSV
					</button>
					<button onClick={() => { const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sampleSheet(), 'Libro de Clases'); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(SAMPLE_ANNOTATIONS, { header: ANNOTATION_COLUMNS }), 'Anotaciones'); XLSX.writeFile(workbook, 'plantilla-librodeclases.xlsx'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50">
						Descargar plantilla Excel
					</button>
				</div>
			</div>

			<div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
				<h3 className="font-display text-lg font-bold">Resumen de datos</h3>
				<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
					<Stat label="Instituciones" value={institutions.length} />
					<Stat label="Cursos" value={courses} />
					<Stat label="Estudiantes" value={students} />
					<Stat label="Evaluaciones" value={evaluations} />
				</div>
				<div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
					<select value={format} onChange={event => setFormat(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
						<option value="csv">CSV</option>
						<option value="xlsx">Excel</option>
						<option value="json">JSON</option>
					</select>
					<button onClick={() => onExport(format)} className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white">Exportar datos</button>
				</div>
			</div>
		</section>
	);
}

function Stat({ label, value }) {
	return (
		<div className="rounded-xl bg-paper px-4 py-3">
			<p className="text-xs text-slate-400">{label}</p>
			<p className="font-display text-2xl font-bold">{value}</p>
		</div>
	);
}

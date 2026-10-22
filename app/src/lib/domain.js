// Reglas de negocio puras, portadas desde el prototipo original (index.html de la raíz del repo).

export const levels = [...Array(8)].map((_, index) => `${index + 1}º Básico`).concat([...Array(4)].map((_, index) => `${index + 1}º Medio`));
export const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const courseColors = ['coral', 'teal', 'sun', 'blue', 'violet'];

export const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const colorClasses = color => ({
	coral: 'bg-[#fff0eb] text-[#c9543d]',
	teal: 'bg-[#e5f4f1] text-teal',
	sun: 'bg-[#fff7db] text-[#987513]',
	blue: 'bg-[#eaf1ff] text-[#4166aa]',
	violet: 'bg-[#f2edff] text-[#7451af]',
}[color] || 'bg-slate-100 text-slate-600');

export function makeCourse(name, color = courseColors[Math.floor(Math.random() * courseColors.length)]) {
	const courseId = uid('course');
	return {
		id: courseId,
		name,
		level: levels.find(level => name.startsWith(level)) || 'Personalizado',
		letter: letters.find(letter => name.endsWith(` ${letter}`)) || '',
		color,
		scaleMin: 1,
		scaleMax: 7,
		students: [],
		evaluations: [],
		grades: {},
	};
}

export function makeInstitution(name = 'Mi institución', type = 'Colegio') {
	return { id: uid('institution'), name, type, courses: [] };
}

export function normalizeDate(value) {
	if (!value) return null;
	const text = String(value).trim();
	const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const date = iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : text;
	if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return undefined;
	const [day, month, year] = date.split('/').map(Number);
	const parsed = new Date(year, month - 1, day);
	return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? date : undefined;
}

export const displayDate = value => {
	if (!value) return '—';
	const text = String(value);
	const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : text;
};

export const dateToInput = value => {
	const normalized = normalizeDate(value);
	return normalized ? normalized.split('/').reverse().join('-') : '';
};

export const dateToComparable = value => {
	const normalized = normalizeDate(value);
	return normalized ? normalized.split('/').reverse().join('') : '';
};

export const formatGrade = grade => (grade == null || Number.isNaN(Number(grade)) ? '—' : Number(grade).toFixed(2).replace(/\.00$/, '.0'));

export const parseGrade = (value, course) => {
	if (value === '') return null;
	const numeric = Number(value);
	const min = Number(course?.scaleMin ?? 1);
	const max = Number(course?.scaleMax ?? 7);
	if (!Number.isFinite(numeric) || numeric < min || numeric > max || !/^\d+(\.\d{1,2})?$/.test(String(value))) return undefined;
	return Number(numeric.toFixed(2));
};

export const MAX_TOTAL_WEIGHT = 100;

const roundWeight = value => Math.round(value * 100) / 100;

// Suma de ponderaciones del curso; excludeId permite calcular el total al editar una evaluación.
export const totalWeight = (course, excludeId) => roundWeight((course?.evaluations || []).filter(evaluation => evaluation.id !== excludeId).reduce((sum, evaluation) => sum + Number(evaluation.weight || 0), 0));

export const availableWeight = (course, excludeId) => roundWeight(Math.max(0, MAX_TOTAL_WEIGHT - totalWeight(course, excludeId)));

// Devuelve un mensaje de error o null si la ponderación es válida para el curso.
export function validateWeight(course, weight, excludeId) {
	const numeric = Number(weight);
	if (!Number.isFinite(numeric) || numeric <= 0) return 'La ponderación debe ser mayor a 0%';
	const available = availableWeight(course, excludeId);
	if (roundWeight(numeric) > available) return `La ponderación supera el 100% del curso. Disponible: ${available}%`;
	return null;
}

// Nota final acumulada: cada nota aporta nota × ponderación / 100 (ej. 6.5 al 10% = 0.65).
// Las evaluaciones sin nota no aportan, por lo que la nota crece a medida que se registran.
export const average = (course, studentId) => {
	const graded = course?.evaluations.filter(evaluation => hasGrade(course, studentId, evaluation.id));
	if (!graded?.length) return null;
	return graded.reduce((sum, evaluation) => sum + Number(course.grades[studentId][evaluation.id]) * Number(evaluation.weight || 0) / MAX_TOTAL_WEIGHT, 0);
};

const todayComparable = () => {
	const now = new Date();
	return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

const hasGrade = (course, studentId, evaluationId) => {
	const value = course.grades?.[studentId]?.[evaluationId];
	return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
};

// Estudiantes de quienes se espera nota en una evaluación: activos y que ya estaban en el curso
// en la fecha de la evaluación (un ingreso posterior no deja notas pendientes). Si ya tiene nota, siempre cuenta.
const expectedStudents = (course, evaluation) => (course?.students || []).filter(student => {
	if (student.active === false) return false;
	if (hasGrade(course, student.id, evaluation.id)) return true;
	const ingreso = dateToComparable(student.ingreso);
	const date = dateToComparable(evaluation.date);
	return !ingreso || !date || ingreso <= date;
});

// Avance del curso: solo considera estudiantes esperados (los retirados o ingresados después no tienen notas pendientes).
// completedWeight = ponderación de evaluaciones con todas las notas registradas,
// pendingWeight = ponderación creada pero con notas faltantes, unplannedWeight = lo que falta crear para llegar al 100%.
// Las evaluaciones con fecha futura no generan notas pendientes (aún no se rinden).
export function courseProgress(course) {
	const today = todayComparable();
	const evaluations = (course?.evaluations || []).map(evaluation => {
		const expected = expectedStudents(course, evaluation);
		const graded = expected.filter(student => hasGrade(course, student.id, evaluation.id)).length;
		const date = dateToComparable(evaluation.date);
		return { id: evaluation.id, graded, total: expected.length, complete: expected.length > 0 && graded === expected.length, upcoming: Boolean(date) && date > today && graded === 0 };
	});
	const byId = Object.fromEntries(evaluations.map(item => [item.id, item]));
	const completedWeight = roundWeight((course?.evaluations || []).filter(evaluation => byId[evaluation.id].complete).reduce((sum, evaluation) => sum + Number(evaluation.weight || 0), 0));
	const planned = totalWeight(course);
	return {
		byId,
		completedWeight,
		pendingWeight: roundWeight(Math.max(0, planned - completedWeight)),
		unplannedWeight: roundWeight(Math.max(0, MAX_TOTAL_WEIGHT - planned)),
		plannedWeight: planned,
		pendingGrades: evaluations.filter(item => !item.upcoming).reduce((sum, item) => sum + item.total - item.graded, 0),
		pendingEvaluations: evaluations.filter(item => !item.complete && !item.upcoming).length,
		upcomingEvaluations: evaluations.filter(item => item.upcoming).length,
	};
}

// Nota mínima de aprobación del curso (configurable al crear/editar el curso; por defecto 4.0).
export const passingGrade = course => Number(course?.passingGrade ?? 4);

// Margen sobre la nota de aprobación bajo el cual el estudiante queda "en atención" (amarillo).
const WARNING_MARGIN = 0.5;
const EPSILON = 1e-9;

export const STANDINGS = {
	failed: { label: 'Reprobado', dot: 'bg-[#dc2626]', text: 'text-[#dc2626]', badge: 'bg-[#fee2e2] text-[#b91c1c]' },
	risk: { label: 'En riesgo', dot: 'bg-coral', text: 'text-coral', badge: 'bg-[#fff0eb] text-[#c9543d]' },
	warning: { label: 'Atención', dot: 'bg-sun', text: 'text-[#987513]', badge: 'bg-[#fff7db] text-[#987513]' },
	ok: { label: 'Al día', dot: 'bg-teal', text: 'text-teal', badge: 'bg-[#e5f4f1] text-teal' },
	none: { label: 'Sin notas', dot: 'bg-slate-300', text: 'text-slate-400', badge: 'bg-slate-100 text-slate-500' },
};

// Situación de un estudiante respecto de la aprobación, considerando solo la ponderación ya calificada:
// - accumulated: nota final acumulada (Σ nota × peso / 100).
// - currentAverage: promedio de lo rendido (proyección si mantiene su rendimiento).
// - needed: promedio que necesita en la ponderación restante para llegar a la nota de aprobación.
export function studentStanding(course, studentId) {
	const pass = passingGrade(course);
	const scaleMin = Number(course?.scaleMin ?? 1);
	const scaleMax = Number(course?.scaleMax ?? 7);
	const graded = (course?.evaluations || []).filter(evaluation => hasGrade(course, studentId, evaluation.id));
	const gradedWeight = roundWeight(graded.reduce((sum, evaluation) => sum + Number(evaluation.weight || 0), 0));
	const base = { pass, gradedWeight, remainingWeight: roundWeight(Math.max(0, MAX_TOTAL_WEIGHT - gradedWeight)) };
	if (!graded.length || gradedWeight <= 0) return { ...base, status: 'none', accumulated: null, currentAverage: null, needed: null };

	const accumulated = average(course, studentId);
	const currentAverage = (accumulated * MAX_TOTAL_WEIGHT) / gradedWeight;
	const finished = base.remainingWeight <= 0;
	const needed = finished ? null : Math.ceil(((pass - accumulated) * MAX_TOTAL_WEIGHT / base.remainingWeight) * 100 - EPSILON) / 100;
	const secured = finished ? accumulated + EPSILON >= pass : needed <= scaleMin;
	const unreachable = finished ? !secured : needed > scaleMax;
	let status = 'ok';
	// Reprobado: ya tiene el 100% calificado y no alcanzó la nota de aprobación.
	if (finished && !secured) status = 'failed';
	else if (!secured && (unreachable || currentAverage + EPSILON < pass)) status = 'risk';
	else if (!secured && currentAverage < pass + WARNING_MARGIN) status = 'warning';
	return {
		...base, status, accumulated, currentAverage, needed, secured, unreachable, finished,
		expected: (pass * gradedWeight) / MAX_TOTAL_WEIGHT,
		maxPossible: (scaleMax * gradedWeight) / MAX_TOTAL_WEIGHT,
	};
}

// Textos explicativos de la situación (resumen + qué necesita para aprobar).
export function standingMessages(standing) {
	const { status, accumulated, gradedWeight, remainingWeight, pass, needed, expected, maxPossible } = standing;
	if (status === 'none') return { summary: 'Sin notas registradas todavía', need: `Necesita promediar ${formatGrade(pass)} para aprobar` };
	const summary = `Lleva ${formatGrade(accumulated)} de ${formatGrade(maxPossible)} posibles al ${gradedWeight}% (mínimo esperado ${formatGrade(expected)})`;
	if (standing.finished) return { summary, need: standing.secured ? `Aprobado con ${formatGrade(accumulated)}` : `Reprobado con ${formatGrade(accumulated)} (mínimo ${formatGrade(pass)})` };
	if (standing.secured) return { summary, need: 'Aprobación asegurada' };
	if (standing.unreachable) return { summary, need: `No alcanza el ${formatGrade(pass)}: necesitaría ${formatGrade(needed)} en el ${remainingWeight}% restante` };
	return { summary, need: `Necesita promediar ${formatGrade(needed)} en el ${remainingWeight}% restante` };
}

// Estadísticas de una evaluación (solo estudiantes activos) con histograma en tramos de 1 punto.
export function evaluationStats(course, evaluationId) {
	const pass = passingGrade(course);
	const scaleMin = Number(course?.scaleMin ?? 1);
	const scaleMax = Number(course?.scaleMax ?? 7);
	const evaluation = (course?.evaluations || []).find(item => item.id === evaluationId);
	const active = evaluation ? expectedStudents(course, evaluation) : [];
	const values = active.filter(student => hasGrade(course, student.id, evaluationId)).map(student => Number(course.grades[student.id][evaluationId]));
	const span = scaleMax - scaleMin;
	const binCount = span <= 10 ? Math.max(1, Math.ceil(span)) : 10;
	const width = span / binCount;
	const bins = [...Array(binCount)].map((_, index) => {
		const from = scaleMin + index * width;
		const last = index === binCount - 1;
		return { from, to: last ? scaleMax : from + width, label: `${from.toFixed(1)}–${(last ? scaleMax : from + width - 0.1).toFixed(1)}`, belowPass: from + width <= pass + EPSILON, count: 0 };
	});
	values.forEach(value => { bins[Math.min(binCount - 1, Math.max(0, Math.floor((value - scaleMin) / width)))].count += 1; });
	const passed = values.filter(value => value + EPSILON >= pass).length;
	return {
		count: values.length,
		total: active.length,
		average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
		min: values.length ? Math.min(...values) : null,
		max: values.length ? Math.max(...values) : null,
		passed,
		passRate: values.length ? Math.round((passed / values.length) * 100) : null,
		pass,
		bins,
	};
}

// Todas las evaluaciones de todas las instituciones/cursos, para el calendario.
export function allEvaluations(institutions) {
	return institutions.flatMap(institution => institution.courses.flatMap(course => {
		const progress = courseProgress(course);
		return course.evaluations.filter(evaluation => normalizeDate(evaluation.date)).map(evaluation => ({
			...evaluation,
			key: dateToComparable(evaluation.date),
			institutionId: institution.id,
			institutionName: institution.name,
			subject: institution.subject || null,
			courseId: course.id,
			courseName: course.name,
			courseColor: course.color,
			graded: progress.byId[evaluation.id],
		}));
	})).sort((first, second) => first.key.localeCompare(second.key) || first.courseName.localeCompare(second.courseName, 'es'));
}

// Tratamiento según el género declarado por el usuario (se usa en saludos y mensajes).
export const HONORIFIC_OPTIONS = [
	{ value: 'Profesora', label: 'Profesora', hint: 'Femenino' },
	{ value: 'Profesor', label: 'Profesor', hint: 'Masculino' },
	{ value: 'Profe', label: 'Profe', hint: 'Neutro' },
];

export const ANNOTATION_TYPES = {
	positive: { label: 'Positiva', short: '+', badge: 'bg-[#e5f4f1] text-teal' },
	negative: { label: 'Negativa', short: '−', badge: 'bg-[#fff0eb] text-[#c9543d]' },
	info: { label: 'Informativa', short: 'i', badge: 'bg-[#eaf1ff] text-[#4166aa]' },
};

export const annotationCounts = student => (student.annotations || []).reduce((counts, item) => ({ ...counts, [item.type]: (counts[item.type] || 0) + 1 }), {});

export const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

// "Profesora María" — usa el tratamiento elegido en el perfil; por defecto neutro.
export function teacherTitle(teacher, user, { firstNameOnly = false } = {}) {
	const fullName = (teacher?.displayName || user?.displayName || '').trim();
	const name = firstNameOnly ? fullName.split(/\s+/)[0] : fullName;
	return [teacher?.honorific || 'Profesor(a)', name].filter(Boolean).join(' ');
}

export const timestamp = () => {
	const now = new Date();
	const pad = value => String(value).padStart(2, '0');
	return `${pad(now.getDate())}_${pad(now.getMonth() + 1)}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
};

export function sortStudents(students) {
	return [...students].sort((first, second) => {
		const activeOrder = Number(second.active !== false) - Number(first.active !== false);
		return activeOrder || first.name.localeCompare(second.name, 'es', { sensitivity: 'base' });
	});
}

export function emptyData() {
	return { institutions: [makeInstitution('Mi institución')] };
}

// Adapta el formato de nómina exportado (ver nominas_2026_profesora_maria_jesus.json en la raíz del repo).
export function importRosterFile(raw) {
	const courses = raw.cursos.map((sourceCourse, index) => {
		const name = sourceCourse.curso.replace(/\s+/g, ' ').replace(/"/g, '').trim();
		const course = makeCourse(name, courseColors[index % courseColors.length]);
		course.teacher = sourceCourse.profesor_jefe?.trim();
		course.sourceSheet = sourceCourse.hoja;
		course.students = sourceCourse.estudiantes.map(student => ({
			id: `student-${student.run || uid('student')}`,
			name: student.nombre_completo.trim(),
			rut: student.rut || student.run || null,
			order: student.n_orden,
			enrollment: student.n_matricula,
			ingreso: normalizeDate(student.ingreso) || null,
			retiro: normalizeDate(student.retiro) || null,
			active: !student.retiro,
		}));
		course.grades = Object.fromEntries(course.students.map(student => [student.id, {}]));
		return course;
	});
	return { institutions: [{ id: uid('institution'), name: 'Liceo de Aplicación 2026', type: 'Liceo', owner: raw.profesora_asignatura?.nombre, subject: raw.profesora_asignatura?.asignatura, schoolYear: raw.ano_escolar, courses }] };
}

// ---------------------------------------------------------------------------
// Exportación / importación
// Formato plano (CSV/Excel): una fila por estudiante × evaluación. Cursos sin evaluaciones o sin
// estudiantes, e instituciones sin cursos, igual generan una fila para no perderse al reimportar.
// Excel agrega una segunda hoja "Anotaciones". JSON contiene el árbol completo.
// ---------------------------------------------------------------------------
export const EXPORT_FORMAT_VERSION = 2;
export const EXPORT_COLUMNS = [
	'Institucion', 'Tipo institucion', 'Curso', 'Nivel', 'Letra', 'Escala minima', 'Escala maxima', 'Nota aprobacion', 'Color',
	'Estudiante', 'RUT', 'Estado', 'Ingreso', 'Retiro', 'Edad', 'Apoderado', 'Correo apoderado',
	'Evaluacion', 'Fecha', 'Ponderacion', 'Tipo evaluacion', 'Nota',
	// Columnas informativas (calculadas): se ignoran al importar.
	'Nota acumulada', 'Promedio rendido', 'Situacion', 'Anotaciones',
];
export const ANNOTATION_COLUMNS = ['Institucion', 'Curso', 'Estudiante', 'RUT', 'Tipo anotacion', 'Fecha', 'Comentario'];

const blankRow = () => Object.fromEntries(EXPORT_COLUMNS.map(column => [column, '']));

export function exportRows(institutions) {
	const rows = [];
	institutions.forEach(institution => {
		const institutionCells = { Institucion: institution.name, 'Tipo institucion': institution.type };
		if (!institution.courses.length) rows.push({ ...blankRow(), ...institutionCells });
		institution.courses.forEach(course => {
			const courseCells = { ...institutionCells, Curso: course.name, Nivel: course.level, Letra: course.letter, 'Escala minima': course.scaleMin, 'Escala maxima': course.scaleMax, 'Nota aprobacion': passingGrade(course), Color: course.color || '' };
			if (!course.students.length) rows.push({ ...blankRow(), ...courseCells });
			course.students.forEach(student => {
				const standing = studentStanding(course, student.id);
				const studentCells = {
					...courseCells, Estudiante: student.name, RUT: student.rut || '', Estado: student.active !== false ? 'Activo' : 'Inactivo',
					Ingreso: student.ingreso ? displayDate(student.ingreso) : '', Retiro: student.retiro ? displayDate(student.retiro) : '',
					Edad: student.age ?? '', Apoderado: student.guardianName || '', 'Correo apoderado': student.guardianEmail || '',
					'Nota acumulada': standing.accumulated == null ? '' : Number(standing.accumulated.toFixed(2)),
					'Promedio rendido': standing.currentAverage == null ? '' : Number(standing.currentAverage.toFixed(2)),
					Situacion: student.active === false ? 'Retirado' : STANDINGS[standing.status].label,
					Anotaciones: (student.annotations || []).length,
				};
				if (!course.evaluations.length) rows.push({ ...blankRow(), ...studentCells });
				course.evaluations.forEach(evaluation => rows.push({
					...blankRow(), ...studentCells,
					Evaluacion: evaluation.title, Fecha: evaluation.date ? displayDate(evaluation.date) : '', Ponderacion: evaluation.weight, 'Tipo evaluacion': evaluation.type,
					Nota: course.grades?.[student.id]?.[evaluation.id] ?? '',
				}));
			});
		});
	});
	return rows;
}

export function exportAnnotationRows(institutions) {
	return institutions.flatMap(institution => institution.courses.flatMap(course => course.students.flatMap(student => (student.annotations || []).map(item => ({
		Institucion: institution.name, Curso: course.name, Estudiante: student.name, RUT: student.rut || '',
		'Tipo anotacion': (ANNOTATION_TYPES[item.type] || ANNOTATION_TYPES.info).label, Fecha: displayDate(item.date), Comentario: item.comment,
	})))));
}

// Archivo JSON exportado: incluye metadatos de formato; la importación acepta también el árbol sin metadatos.
export const exportJson = data => ({ app: 'librodeclases-cl', formatVersion: EXPORT_FORMAT_VERSION, exportedAt: new Date().toISOString(), institutions: data.institutions });

const cellText = value => (value == null ? '' : String(value).trim());
// Acepta "6,5" (coma decimal de Excel en español) y números.
const parseNumber = value => {
	const raw = cellText(value).replace(',', '.');
	return raw === '' ? null : Number(raw);
};
const todayDate = () => {
	const now = new Date();
	return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
};
// Acepta dd/mm/aaaa, aaaa-mm-dd o el número de serie de fecha de Excel.
const parseCellDate = value => {
	if (typeof value === 'number' && value > 20000 && value < 80000) {
		const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
		return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
	}
	return normalizeDate(cellText(value)) || null;
};
const annotationTypeFromLabel = label => Object.keys(ANNOTATION_TYPES).find(key => ANNOTATION_TYPES[key].label.toLowerCase() === cellText(label).toLowerCase()) || 'info';

// Reconstruye instituciones/cursos/estudiantes/evaluaciones/notas/anotaciones desde filas planas (CSV/Excel del export).
export function importFlatRows(rows, annotationRows = []) {
	const institutions = [];
	const institutionMap = new Map();
	const courseMap = new Map();
	const findStudent = (course, rut, name) => course.students.find(item => (rut ? item.rut === rut : item.name === name));

	rows.forEach(row => {
		const institutionName = cellText(row.Institucion);
		if (!institutionName) return;
		const institutionType = cellText(row['Tipo institucion']) || 'Colegio';
		const institutionKey = `${institutionName}|${institutionType}`;
		if (!institutionMap.has(institutionKey)) {
			const item = makeInstitution(institutionName, institutionType);
			institutionMap.set(institutionKey, item);
			institutions.push(item);
		}
		const institution = institutionMap.get(institutionKey);
		const courseName = cellText(row.Curso);
		if (!courseName) return;
		const courseKey = `${institutionName}|${courseName}`;
		if (!courseMap.has(courseKey)) {
			const course = makeCourse(courseName, courseColors.includes(cellText(row.Color)) ? cellText(row.Color) : undefined);
			course.level = cellText(row.Nivel) || 'Personalizado';
			course.letter = cellText(row.Letra);
			const scaleMin = parseNumber(row['Escala minima']);
			const scaleMax = parseNumber(row['Escala maxima']);
			if (Number.isFinite(scaleMin) && Number.isFinite(scaleMax) && scaleMin < scaleMax) Object.assign(course, { scaleMin, scaleMax });
			const pass = parseNumber(row['Nota aprobacion']);
			if (Number.isFinite(pass) && pass > course.scaleMin && pass <= course.scaleMax) course.passingGrade = pass;
			institution.courses.push(course);
			courseMap.set(courseKey, course);
		}
		const course = courseMap.get(courseKey);
		const studentName = cellText(row.Estudiante);
		if (!studentName) return;
		const rut = cellText(row.RUT) || null;
		let student = findStudent(course, rut, studentName);
		if (!student) {
			const age = parseNumber(row.Edad);
			student = {
				id: uid('student'),
				name: studentName,
				rut,
				active: cellText(row.Estado) !== 'Inactivo',
				ingreso: parseCellDate(row.Ingreso),
				retiro: parseCellDate(row.Retiro),
				age: Number.isInteger(age) && age > 0 ? age : null,
				guardianName: cellText(row.Apoderado) || null,
				guardianEmail: cellText(row['Correo apoderado']) || null,
				annotations: [],
			};
			course.students.push(student);
			course.grades[student.id] = {};
		}
		const title = cellText(row.Evaluacion);
		if (title) {
			const date = parseCellDate(row.Fecha);
			let evaluation = course.evaluations.find(item => item.title === title && item.date === date);
			if (!evaluation) {
				const weight = parseNumber(row.Ponderacion);
				evaluation = { id: uid('evaluation'), title, date, weight: Number.isFinite(weight) && weight > 0 ? weight : 0, type: cellText(row['Tipo evaluacion']) || 'Prueba' };
				course.evaluations.push(evaluation);
			}
			const grade = parseNumber(row.Nota);
			if (Number.isFinite(grade) && grade >= course.scaleMin && grade <= course.scaleMax) course.grades[student.id][evaluation.id] = Number(grade.toFixed(2));
		}
	});

	annotationRows.forEach(row => {
		const course = courseMap.get(`${cellText(row.Institucion)}|${cellText(row.Curso)}`);
		const student = course && findStudent(course, cellText(row.RUT) || null, cellText(row.Estudiante));
		const comment = cellText(row.Comentario);
		if (!student || !comment) return;
		student.annotations.push({ id: uid('note'), type: annotationTypeFromLabel(row['Tipo anotacion']), date: parseCellDate(row.Fecha) || todayDate(), comment });
	});
	return { institutions };
}

// Valida y completa la forma de un JSON importado (export de la app); lanza error si no es válido.
export function normalizeData(raw) {
	if (!Array.isArray(raw?.institutions)) throw new Error('Formato no reconocido');
	const number = (value, fallback) => (value !== '' && value !== null && Number.isFinite(Number(value)) ? Number(value) : fallback);
	return {
		institutions: raw.institutions.map(institution => ({
			...institution,
			id: cellText(institution.id) || uid('institution'),
			name: cellText(institution.name) || 'Institución',
			type: cellText(institution.type) || 'Colegio',
			courses: (Array.isArray(institution.courses) ? institution.courses : []).map(course => {
				const students = (Array.isArray(course.students) ? course.students : []).filter(student => cellText(student?.name)).map(student => ({
					...student,
					id: cellText(student.id) || uid('student'),
					name: cellText(student.name),
					annotations: (Array.isArray(student.annotations) ? student.annotations : []).filter(item => cellText(item?.comment)).map(item => ({ id: cellText(item.id) || uid('note'), type: ANNOTATION_TYPES[item.type] ? item.type : 'info', date: normalizeDate(item.date) || null, comment: cellText(item.comment) })),
				}));
				const evaluations = (Array.isArray(course.evaluations) ? course.evaluations : []).filter(evaluation => cellText(evaluation?.title)).map(evaluation => ({
					...evaluation, id: cellText(evaluation.id) || uid('evaluation'), title: cellText(evaluation.title), date: normalizeDate(evaluation.date) || null, weight: number(evaluation.weight, 0), type: cellText(evaluation.type) || 'Prueba',
				}));
				const evaluationIds = new Set(evaluations.map(item => item.id));
				const grades = Object.fromEntries(students.map(student => [student.id, Object.fromEntries(Object.entries(course.grades?.[student.id] || {}).filter(([id, value]) => evaluationIds.has(id) && (value === null || Number.isFinite(Number(value)))))]));
				const scaleMin = number(course.scaleMin, 1);
				const scaleMax = number(course.scaleMax, 7);
				return { ...course, id: cellText(course.id) || uid('course'), name: cellText(course.name) || 'Curso', scaleMin, scaleMax: scaleMax > scaleMin ? scaleMax : scaleMin + 6, students, evaluations, grades };
			}),
		})),
	};
}

// Al agregar datos importados a los existentes se generan IDs nuevos de institución y curso
// (los de estudiantes/evaluaciones son locales a cada curso), evitando duplicados al reimportar un respaldo propio.
export const withFreshIds = institutions => institutions.map(institution => ({ ...institution, id: uid('institution'), courses: institution.courses.map(course => ({ ...course, id: uid('course') })) }));

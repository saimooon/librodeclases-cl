// Datos de demostración (sin registro): se generan en memoria y nunca se guardan en la base de datos.
// Son deterministas (semilla fija) y las fechas son relativas a hoy para que el calendario
// siempre muestre evaluaciones pasadas y próximas.

const FIRST_NAMES = ['Sofía', 'Mateo', 'Isidora', 'Benjamín', 'Florencia', 'Agustín', 'Emilia', 'Vicente', 'Josefa', 'Tomás', 'Antonia', 'Martín', 'Catalina', 'Joaquín', 'Trinidad', 'Lucas', 'Fernanda', 'Diego', 'Amanda', 'Maximiliano', 'Valentina', 'Cristóbal', 'Javiera', 'Gaspar'];
const LAST_NAMES = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela'];
const GUARDIAN_NAMES = ['Carolina', 'Rodrigo', 'Paula', 'Andrés', 'Marcela', 'Felipe', 'Claudia', 'Jorge', 'Daniela', 'Patricio'];
const ANNOTATIONS = [
	['positive', 'Excelente participación en clases y apoyo a sus compañeros.'],
	['positive', 'Entregó el proyecto con creatividad y antes del plazo.'],
	['negative', 'No trae materiales por tercera vez en el mes.'],
	['negative', 'Interrumpe reiteradamente el desarrollo de la clase.'],
	['info', 'Apoderado informa control médico; se ausentará el viernes.'],
	['info', 'Se coordinó reforzamiento los martes después de clases.'],
];

// Generador pseudoaleatorio con semilla (mulberry32) para que la demo sea siempre igual.
function seededRandom(seed) {
	let state = seed;
	return () => {
		state |= 0; state = (state + 0x6d2b79f5) | 0;
		let value = Math.imul(state ^ (state >>> 15), 1 | state);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

const dayOffset = days => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};
const clampGrade = value => Math.min(7, Math.max(1, Math.round(value * 10) / 10));

// spec.evaluations: [título, tipo, peso, díasRelativos, fracciónCalificada, ajusteDificultad]
function buildCourse(random, { id, name, level, letter, color, size, ageBase, evaluations, extras = {} }) {
	const used = new Set();
	const students = [...Array(size)].map((_, index) => {
		let fullName;
		do {
			fullName = `${LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]} ${LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]} ${FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]}`;
		} while (used.has(fullName));
		used.add(fullName);
		const lastName = fullName.split(' ')[0];
		const guardian = `${GUARDIAN_NAMES[Math.floor(random() * GUARDIAN_NAMES.length)]} ${lastName}`;
		const rutBody = 22000000 + Math.floor(random() * 3000000);
		return {
			id: `${id}-s${index + 1}`,
			name: fullName,
			rut: `${rutBody}-${Math.floor(random() * 10)}`,
			active: true,
			age: ageBase + (random() < 0.25 ? 1 : 0),
			guardianName: random() < 0.85 ? guardian : null,
			guardianEmail: random() < 0.75 ? `${guardian.split(' ')[0].toLowerCase()}.${lastName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@correo.cl` : null,
			ingreso: dayOffset(-200),
			retiro: null,
			annotations: [],
			// Habilidad base: define el rendimiento (distribución variada: altos, medios, bajos).
			skill: 3.2 + random() * 3.6,
		};
	});

	const evaluationList = evaluations.map(([title, type, weight, days], index) => ({ id: `${id}-e${index + 1}`, title, type, weight, date: dayOffset(days) }));
	const grades = Object.fromEntries(students.map(student => [student.id, {}]));
	evaluations.forEach(([, , , days, gradedFraction = 1, difficulty = 0], index) => {
		if (days > 0) return; // evaluaciones futuras sin notas
		students.forEach(student => {
			if (random() > gradedFraction) return;
			grades[student.id][evaluationList[index].id] = clampGrade(student.skill + difficulty + (random() - 0.5) * 1.6);
		});
	});

	// Estudiante sin notas (ingreso reciente) y estudiante retirado.
	if (extras.newcomer) {
		const student = students[students.length - 1];
		student.ingreso = dayOffset(-3);
		grades[student.id] = {};
	}
	if (extras.retired) {
		const student = students[students.length - 2];
		student.active = false;
		student.retiro = dayOffset(-25);
	}
	// Anotaciones repartidas en algunos estudiantes.
	students.forEach((student, index) => {
		if (index % 3 !== 0) return;
		const count = 1 + Math.floor(random() * 3);
		for (let n = 0; n < count; n += 1) {
			const [type, comment] = ANNOTATIONS[Math.floor(random() * ANNOTATIONS.length)];
			student.annotations.push({ id: `${student.id}-n${n + 1}`, type, date: dayOffset(-Math.floor(random() * 60)), comment });
		}
	});
	students.forEach(student => delete student.skill);

	return { id, name, level, letter, color, scaleMin: 1, scaleMax: 7, passingGrade: 4, students, evaluations: evaluationList, grades };
}

export function buildDemoData() {
	const random = seededRandom(2026);
	return {
		institutions: [
			{
				id: 'demo-liceo',
				name: 'Liceo Demo Bicentenario',
				type: 'Liceo',
				courses: [
					// Curso en progreso: evaluación reciente a medio calificar y una próxima.
					buildCourse(random, { id: 'demo-1ma', name: '1º Medio A', level: '1º Medio', letter: 'A', color: 'teal', size: 18, ageBase: 14, extras: { newcomer: true, retired: true }, evaluations: [
						['Prueba diagnóstica', 'Prueba', 20, -40], ['Control de lectura', 'Quiz', 20, -21], ['Prueba unidad 1', 'Prueba', 30, -4, 0.6], ['Disertación', 'Oral', 30, 9],
					] }),
					// Curso cerrado al 100%: muestra aprobados y reprobados, y una prueba "muy difícil".
					buildCourse(random, { id: 'demo-2mb', name: '2º Medio B', level: '2º Medio', letter: 'B', color: 'coral', size: 16, ageBase: 15, extras: { retired: true }, evaluations: [
						['Prueba 1', 'Prueba', 25, -70], ['Proyecto grupal', 'Proyecto', 25, -50], ['Prueba 2 (difícil)', 'Prueba', 25, -30, 1, -1.9], ['Examen semestral', 'Prueba', 25, -12],
					] }),
					// Ponderación incompleta (60%): muestra el tramo "sin evaluación creada".
					buildCourse(random, { id: 'demo-3ma', name: '3º Medio A', level: '3º Medio', letter: 'A', color: 'sun', size: 14, ageBase: 16, evaluations: [
						['Ensayo argumentativo', 'Proyecto', 30, -15], ['Prueba unidad 2', 'Prueba', 30, 2],
					] }),
				],
			},
			{
				id: 'demo-colegio',
				name: 'Colegio Demo Los Aromos',
				type: 'Colegio',
				courses: [
					buildCourse(random, { id: 'demo-7ba', name: '7º Básico A', level: '7º Básico', letter: 'A', color: 'blue', size: 15, ageBase: 12, extras: { newcomer: true }, evaluations: [
						['Quiz fracciones', 'Quiz', 15, -18], ['Prueba números', 'Prueba', 35, -7], ['Participación', 'Participación', 15, 0, 0.5], ['Prueba geometría', 'Prueba', 35, 16],
					] }),
					buildCourse(random, { id: 'demo-8bb', name: '8º Básico B', level: '8º Básico', letter: 'B', color: 'violet', size: 12, ageBase: 13, evaluations: [
						['Prueba inicial', 'Prueba', 40, 5],
					] }),
				],
			},
		],
	};
}

export const DEMO_USER = { uid: 'demo', email: 'demo@librodeclases.cl', displayName: 'María Demo', phoneNumber: null, providers: [] };
export const DEMO_TEACHER = { displayName: 'María Demo', honorific: 'Profesora', email: 'demo@librodeclases.cl', plan: 'demo' };

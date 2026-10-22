// Script de una sola vez para migrar nominas_2026_profesora_maria_jesus.json a Firestore.
//
// Uso:
//   1. Genera una clave de cuenta de servicio en Firebase Console > Configuración del proyecto
//      > Cuentas de servicio > Generar nueva clave privada. Guárdala como serviceAccountKey.json
//      en esta misma carpeta (NO la subas a git).
//   2. npm install firebase-admin (en la raíz o en /scripts)
//   3. node scripts/importRoster.js <uid-del-profesor-en-firebase-auth>
'use strict';

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const teacherUid = process.argv[2];
if (!teacherUid) {
	console.error('Uso: node scripts/importRoster.js <uid-del-profesor>');
	process.exit(1);
}

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
	console.error('Falta scripts/serviceAccountKey.json (clave de cuenta de servicio de Firebase).');
	process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

const rawPath = path.join(__dirname, '..', 'nominas_2026_profesora_maria_jesus.json');
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const courseColors = ['coral', 'teal', 'sun', 'blue', 'violet'];

function normalizeDate(value) {
	if (!value) return null;
	const text = String(value).trim();
	const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const date = iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : text;
	return /^\d{2}\/\d{2}\/\d{4}$/.test(date) ? date : null;
}

function buildData() {
	const courses = raw.cursos.map((sourceCourse, index) => {
		const name = sourceCourse.curso.replace(/\s+/g, ' ').replace(/"/g, '').trim();
		const students = sourceCourse.estudiantes.map(student => ({
			id: `student-${student.run || uid('student')}`,
			name: student.nombre_completo.trim(),
			rut: student.rut || student.run || null,
			order: student.n_orden,
			enrollment: student.n_matricula,
			ingreso: normalizeDate(student.ingreso),
			retiro: normalizeDate(student.retiro),
			active: !student.retiro,
		}));
		return {
			id: uid('course'),
			name,
			level: 'Personalizado',
			letter: '',
			color: courseColors[index % courseColors.length],
			scaleMin: 1,
			scaleMax: 7,
			teacher: sourceCourse.profesor_jefe?.trim() || null,
			sourceSheet: sourceCourse.hoja,
			students,
			evaluations: [],
			grades: Object.fromEntries(students.map(student => [student.id, {}])),
		};
	});

	return {
		institutions: [
			{
				id: uid('institution'),
				name: 'Liceo de Aplicación 2026',
				type: 'Liceo',
				owner: raw.profesora_asignatura?.nombre || null,
				subject: raw.profesora_asignatura?.asignatura || null,
				schoolYear: raw.ano_escolar,
				courses,
			},
		],
	};
}

async function main() {
	const data = buildData();
	await db.collection('teachers').doc(teacherUid).set({ data }, { merge: true });
	console.log(`Nómina importada para el profesor ${teacherUid}: ${data.institutions[0].courses.length} cursos.`);
}

main().catch(error => { console.error(error); process.exit(1); });

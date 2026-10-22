import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { saveTeacherData, saveTeacherProfile } from '../services/teacherData';
import { ANNOTATION_COLUMNS, EXPORT_COLUMNS, availableWeight, dateToComparable, emptyData, exportAnnotationRows, exportJson, exportRows, importFlatRows, importRosterFile, isValidEmail, makeCourse, makeInstitution, normalizeData, normalizeDate, parseGrade, teacherTitle, timestamp, uid, validateWeight, withFreshIds } from '../lib/domain';
import { buildDemoData, DEMO_TEACHER, DEMO_USER } from '../lib/demoData';
import { downloadBlob } from '../lib/download';
import Sidebar, { MobileNav } from '../components/Sidebar';
import ProfileMenu from '../components/ProfileMenu';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import Toast from '../components/Toast';
import EntityModal from '../components/EntityModal';
import StudentRecordModal from '../components/StudentRecordModal';
import DashboardView from '../views/DashboardView';
import GradebookView from '../views/GradebookView';
import CoursesView from '../views/CoursesView';
import CalendarView from '../views/CalendarView';
import InstitutionsView from '../views/InstitutionsView';
import ProfileView from '../views/ProfileView';

// demo: datos de prueba en memoria, sin sesión y sin escrituras en la base de datos.
export default function AppShell({ demo = false }) {
	const auth = useAuth();
	const navigate = useNavigate();
	const [demoTeacher, setDemoTeacher] = useState(DEMO_TEACHER);
	const user = demo ? DEMO_USER : auth.user;
	const teacher = demo ? demoTeacher : auth.teacher;
	const logout = demo ? () => navigate('/login') : auth.logout;
	const [data, setData] = useState(null);
	const [view, setView] = useState('dashboard');
	const [selectedInstitutionId, setSelectedInstitutionId] = useState(null);
	const [selectedCourseId, setSelectedCourseId] = useState(null);
	const [toast, setToast] = useState('');
	const [modal, setModal] = useState(null); // { type, editId }
	const [gradeFilter, setGradeFilter] = useState('all'); // filtro inicial al abrir el Libro de notas desde el Resumen
	const [studentModal, setStudentModal] = useState(null); // { studentId, forceRetire, tab }
	const saveTimer = useRef(null);
	const toastTimer = useRef(null);

	useEffect(() => {
		if (!teacher) return;
		setData(previous => previous || (demo ? buildDemoData() : teacher.data || emptyData()));
	}, [teacher, demo]);

	useEffect(() => {
		if (data && !selectedInstitutionId) setSelectedInstitutionId(data.institutions[0]?.id);
	}, [data, selectedInstitutionId]);

	useEffect(() => {
		const institution = data?.institutions.find(item => item.id === selectedInstitutionId);
		if (institution && !institution.courses.find(item => item.id === selectedCourseId)) {
			setSelectedCourseId(institution.courses[0]?.id || null);
		}
	}, [data, selectedInstitutionId, selectedCourseId]);

	const readOnly = false;

	// Se calcula antes del "return" temprano de carga para no violar el orden de hooks entre renders.
	const editingEntity = useMemo(() => {
		if (!data || !modal || !modal.editId) return null;
		const currentInstitution = data.institutions.find(item => item.id === selectedInstitutionId) || data.institutions[0];
		const currentCourse = currentInstitution?.courses.find(item => item.id === selectedCourseId) || currentInstitution?.courses[0];
		if (modal.type === 'institution') return data.institutions.find(item => item.id === modal.editId);
		if (modal.type === 'course') return currentInstitution?.courses.find(item => item.id === modal.editId);
		if (modal.type === 'student') return currentCourse?.students.find(item => item.id === modal.editId);
		return currentCourse?.evaluations.find(item => item.id === modal.editId);
	}, [modal, data, selectedInstitutionId, selectedCourseId]);

	function showToast(message) {
		clearTimeout(toastTimer.current);
		setToast(message);
		toastTimer.current = setTimeout(() => setToast(''), 2400);
	}

	// Persiste en D1 (vía /api/teacher/data) con debounce para no saturar de escrituras mientras se edita.
	function persist(nextData, message) {
		setData(nextData);
		if (message) showToast(message);
		if (demo) return;
		clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => saveTeacherData(user.uid, nextData).catch(() => showToast('No se pudo guardar. Revisa tu conexión.')), 400);
	}

	if (!data) return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>;

	const institution = data.institutions.find(item => item.id === selectedInstitutionId) || data.institutions[0];
	const course = institution?.courses.find(item => item.id === selectedCourseId) || institution?.courses[0];

	function updateInstitutions(mutator) {
		const next = { institutions: data.institutions.map(item => (item.id === institution.id ? mutator(item) : item)) };
		return next;
	}

	function updateCourse(courseId, mutator) {
		return updateInstitutions(inst => ({ ...inst, courses: inst.courses.map(item => (item.id === courseId ? mutator(item) : item)) }));
	}

	function updateStudent(studentId, mutator) {
		return updateCourse(course.id, item => ({ ...item, students: item.students.map(student => (student.id === studentId ? mutator(student) : student)) }));
	}

	const handlers = {
		selectInstitution(id) { setSelectedInstitutionId(id); setSelectedCourseId(null); },
		selectCourse(id) { setSelectedCourseId(id); },
		openGradebook(filter = 'all', institutionId, courseId) {
			if (institutionId) setSelectedInstitutionId(institutionId);
			if (courseId) setSelectedCourseId(courseId);
			setGradeFilter(filter);
			setView('grades');
		},
		setGrade(studentId, evaluationId, value) {
			const grade = parseGrade(value, course);
			if (grade === undefined) return showToast(`La nota debe estar entre ${course.scaleMin} y ${course.scaleMax}, con máximo 2 decimales`);
			if ((course.grades?.[studentId]?.[evaluationId] ?? null) === grade) return;
			persist(updateCourse(course.id, item => ({ ...item, grades: { ...item.grades, [studentId]: { ...item.grades[studentId], [evaluationId]: grade } } })), 'Nota guardada');
		},
		removeEvaluation(evaluationId) {
			if (!confirm('¿Eliminar esta evaluación y sus notas?')) return;
			persist(updateCourse(course.id, item => {
				const grades = Object.fromEntries(Object.entries(item.grades).map(([studentId, values]) => { const rest = { ...values }; delete rest[evaluationId]; return [studentId, rest]; }));
				return { ...item, evaluations: item.evaluations.filter(evaluation => evaluation.id !== evaluationId), grades };
			}), 'Evaluación eliminada');
		},
		removeStudent(studentId) {
			const student = course.students.find(item => item.id === studentId);
			if (!student) return;
			setStudentModal({ studentId, forceRetire: true });
		},
		editStudent(studentId, tab = 'data') { setStudentModal({ studentId, forceRetire: false, tab }); },
		addAnnotation(form) {
			const date = normalizeDate(form.date);
			const comment = form.comment.trim();
			if (!date) { showToast('Usa una fecha válida'); return false; }
			if (!comment) { showToast('Escribe un comentario'); return false; }
			const annotation = { id: uid('note'), type: form.type, date, comment };
			persist(updateStudent(studentModal.studentId, student => ({ ...student, annotations: [...(student.annotations || []), annotation] })), 'Anotación registrada');
		},
		removeAnnotation(annotationId) {
			if (!confirm('¿Eliminar esta anotación?')) return;
			persist(updateStudent(studentModal.studentId, student => ({ ...student, annotations: (student.annotations || []).filter(item => item.id !== annotationId) })), 'Anotación eliminada');
		},
		removeCourse(courseId) {
			if (!confirm('¿Eliminar este curso, sus estudiantes y sus evaluaciones?')) return;
			persist(updateInstitutions(inst => ({ ...inst, courses: inst.courses.filter(item => item.id !== courseId) })), 'Curso eliminado');
		},
		removeInstitution(institutionId) {
			if (data.institutions.length === 1) return showToast('Debe existir al menos una institución');
			if (!confirm('¿Eliminar esta institución y toda su información?')) return;
			const next = { institutions: data.institutions.filter(item => item.id !== institutionId) };
			setSelectedInstitutionId(next.institutions[0].id);
			setSelectedCourseId(null);
			persist(next, 'Institución eliminada');
		},
	};

	// Al navegar desde el menú, el Libro de notas abre sin filtro de situación.
	function setViewResettingFilter(nextView) {
		setGradeFilter('all');
		setView(nextView);
	}

	// En la demo la preferencia queda solo en memoria.
	async function saveHonorific(honorific) {
		try {
			if (demo) setDemoTeacher(current => ({ ...current, honorific }));
			else await saveTeacherProfile(user.uid, { honorific });
			showToast('Preferencia guardada');
		} catch (error) {
			showToast('No se pudo guardar. Revisa tu conexión.');
			throw error;
		}
	}

	function openModal(type, editId = '') { setModal({ type, editId }); }
	function closeModal() { setModal(null); }

	function submitModal(form) {
		const { type, editId } = modal;
		if (type === 'institution') {
			if (editId) persist({ institutions: data.institutions.map(item => (item.id === editId ? { ...item, name: form.name, type: form.type } : item)) }, 'Institución guardada');
			else { const item = makeInstitution(form.name, form.type); persist({ institutions: [...data.institutions, item] }, 'Institución creada'); setSelectedInstitutionId(item.id); }
		} else if (type === 'course') {
			const name = form.customName.trim() || `${form.level}${form.letter ? ` ${form.letter}` : ''}`;
			const scaleMin = Number(form.scaleMin || 1);
			const scaleMax = Number(form.scaleMax || 7);
			if (!Number.isFinite(scaleMin) || !Number.isFinite(scaleMax) || scaleMin >= scaleMax) return showToast('La escala debe tener un mínimo menor que el máximo');
			const passingGrade = Number(form.passingGrade || 4);
			if (!Number.isFinite(passingGrade) || passingGrade <= scaleMin || passingGrade > scaleMax) return showToast('La nota de aprobación debe estar dentro de la escala del curso');
			if (editId) {
				persist(updateInstitutions(inst => ({ ...inst, courses: inst.courses.map(item => (item.id === editId ? { ...item, name, level: form.customName.trim() ? 'Personalizado' : form.level, letter: form.letter, scaleMin, scaleMax, passingGrade } : item)) })), 'Curso actualizado');
			} else {
				const item = makeCourse(name);
				item.level = form.customName.trim() ? 'Personalizado' : form.level;
				item.letter = form.letter;
				item.scaleMin = scaleMin;
				item.scaleMax = scaleMax;
				item.passingGrade = passingGrade;
				persist(updateInstitutions(inst => ({ ...inst, courses: [...inst.courses, item] })), 'Curso creado');
				setSelectedCourseId(item.id);
			}
		} else if (type === 'student') {
			if (editId) persist(updateCourse(course.id, item => ({ ...item, students: item.students.map(student => (student.id === editId ? { ...student, name: form.name } : student)) })), 'Estudiante actualizado');
			else {
				const student = { id: uid('student'), name: form.name, active: true };
				persist(updateCourse(course.id, item => ({ ...item, students: [...item.students, student], grades: { ...item.grades, [student.id]: {} } })), 'Estudiante agregado');
			}
		} else if (type === 'evaluation') {
			const evaluationDate = normalizeDate(form.date);
			if (!evaluationDate) return showToast('Usa una fecha válida');
			const weightError = validateWeight(course, form.weight, editId || undefined);
			if (weightError) return showToast(weightError);
			if (editId) persist(updateCourse(course.id, item => ({ ...item, evaluations: item.evaluations.map(evaluation => (evaluation.id === editId ? { ...evaluation, title: form.title, date: evaluationDate, weight: Number(form.weight), type: form.evaluationType } : evaluation)) })), 'Evaluación actualizada');
			else {
				const evaluation = { id: uid('evaluation'), title: form.title, date: evaluationDate, weight: Number(form.weight), type: form.evaluationType };
				persist(updateCourse(course.id, item => ({ ...item, evaluations: [...item.evaluations, evaluation] })), 'Evaluación creada');
			}
		}
		closeModal();
	}

	function saveStudentRecord(form) {
		const { studentId } = studentModal;
		const ingreso = normalizeDate(form.ingreso);
		const retiro = normalizeDate(form.retiro);
		if ((form.ingreso && !ingreso) || (form.retiro && !retiro)) return showToast('Usa fechas válidas');
		if (form.status === 'inactive' && !retiro) return showToast('Registra una fecha de retiro para inactivar al estudiante');
		if (ingreso && retiro && dateToComparable(ingreso) > dateToComparable(retiro)) return showToast('El ingreso no puede ser posterior al egreso');
		const age = form.age === '' ? null : Number(form.age);
		if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) return showToast('La edad debe ser un número entero entre 1 y 120');
		const guardianEmail = form.guardianEmail.trim();
		if (guardianEmail && !isValidEmail(guardianEmail)) return showToast('El correo del apoderado no es válido');
		persist(updateStudent(studentId, student => ({
			...student, name: form.name.trim(), rut: form.rut?.trim() || null, age, guardianName: form.guardianName.trim() || null, guardianEmail: guardianEmail || null,
			ingreso, active: form.status === 'active', retiro: form.status === 'active' ? null : retiro,
		})), 'Datos del estudiante actualizados');
		setStudentModal(null);
	}

	// CSV: una fila por estudiante × evaluación. Excel: además hoja "Anotaciones". JSON: árbol completo.
	function exportData(format) {
		const rows = exportRows(data.institutions);
		if (!rows.length) return showToast('No hay datos para exportar');
		const fileBase = `librodeclases-datos_${timestamp()}`;
		if (format === 'json') {
			downloadBlob(new Blob([JSON.stringify(exportJson(data), null, 2)], { type: 'application/json;charset=utf-8' }), `${fileBase}.json`);
		} else {
			const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Libro de Clases');
			const annotations = exportAnnotationRows(data.institutions);
			if (annotations.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(annotations, { header: ANNOTATION_COLUMNS }), 'Anotaciones');
			if (format === 'xlsx') XLSX.writeFile(workbook, `${fileBase}.xlsx`);
			else downloadBlob(new Blob(['\ufeff' + XLSX.utils.sheet_to_csv(worksheet)], { type: 'text/csv;charset=utf-8' }), `${fileBase}.csv`);
		}
		showToast(`Datos exportados en ${format.toUpperCase()}`);
	}

	// Acepta 3 formatos: nómina (como nominas_2026_profesora_maria_jesus.json), export completo de la app
	// ({institutions:[...]}), o CSV/Excel con las mismas columnas del export.
	function importData(file, mode) {
		if (!file) return;
		const fileName = file.name.toLowerCase();
		const isCsv = fileName.endsWith('.csv');
		const isJson = fileName.endsWith('.json');
		const reader = new FileReader();
		reader.onload = event => {
			try {
				let imported;
				if (isJson) {
					const raw = JSON.parse(event.target.result);
					imported = raw?.institutions ? normalizeData(raw) : raw?.cursos ? importRosterFile(raw) : null;
				} else {
					// raw: true en CSV evita que fechas como 01/04/2026 se interpreten con formato de EE.UU.
					const workbook = isCsv ? XLSX.read(event.target.result, { type: 'string', raw: true }) : XLSX.read(event.target.result, { type: 'array' });
					const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
					const annotationSheet = workbook.Sheets.Anotaciones;
					const annotationRows = annotationSheet ? XLSX.utils.sheet_to_json(annotationSheet, { defval: '' }) : [];
					imported = rows.length && 'Institucion' in rows[0] ? importFlatRows(rows, annotationRows) : null;
				}
				if (!imported || !imported.institutions.length) throw new Error('Formato no reconocido');
				const next = mode === 'merge' ? { institutions: [...data.institutions, ...withFreshIds(imported.institutions)] } : imported;
				persist(next, mode === 'merge' ? 'Datos importados y agregados' : 'Datos importados (se reemplazaron los anteriores)');
				setSelectedInstitutionId(next.institutions[0]?.id);
				setSelectedCourseId(next.institutions[0]?.courses[0]?.id);
			} catch {
				showToast('No se pudo importar el archivo. Revisa que el formato sea el esperado.');
			}
		};
		if (isCsv || isJson) reader.readAsText(file);
		else reader.readAsArrayBuffer(file);
	}

	const editingStudent = studentModal ? course?.students.find(item => item.id === studentModal.studentId) : null;

	return (
		<div className="app-shell app-min-h mesh flex flex-col">
			<div className="mx-auto flex w-full max-w-[1500px] flex-1">
				<Sidebar institutions={data.institutions} selectedInstitutionId={institution?.id} onSelectInstitution={handlers.selectInstitution} view={view} onSetView={setViewResettingFilter} onLogout={logout} />
				{/* min-w-0 evita que tablas o listas anchas estiren la página (y el fondo) más allá de la pantalla */}
				<main className="flex min-w-0 flex-1 flex-col px-4 pt-5 sm:px-8 sm:pt-8">
					{demo && (
						<div className="mb-4 flex flex-col gap-2 rounded-2xl bg-sun/25 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
							<p><strong>Modo demo:</strong> datos de prueba. Puedes explorar y editar todo, pero los cambios no se guardan.</p>
							<button onClick={() => navigate('/register')} className="shrink-0 rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white">Crear cuenta gratis</button>
						</div>
					)}
					{/* En móvil no hay sidebar: se replica la marca y el selector de institución */}
					<div className="mb-4 flex items-center gap-3 lg:hidden">
						<BrandLogo variant="mark" className="h-9 w-auto shrink-0" />
						<select aria-label="Institución activa" value={institution?.id} onChange={event => handlers.selectInstitution(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold">
							{data.institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
						</select>
					</div>
					<header className="mb-5 flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{teacher?.displayName || user.displayName ? teacherTitle(teacher, user) : user.email || user.phoneNumber}</p>
							<h1 className="font-display text-2xl font-bold">{view === 'dashboard' ? 'Resumen' : view === 'grades' ? 'Libro de notas' : view === 'courses' ? 'Cursos' : view === 'calendar' ? 'Calendario de evaluaciones' : view === 'profile' ? 'Mi perfil' : 'Instituciones'}</h1>
						</div>
						<ProfileMenu teacher={teacher} user={user} onOpenProfile={() => setView('profile')} onLogout={logout} />
					</header>
					{view === 'dashboard' && <DashboardView institutions={data.institutions} institution={institution} course={course} onSelectCourse={handlers.selectCourse} title={teacherTitle(teacher, user)} shortTitle={teacherTitle(teacher, user, { firstNameOnly: true })} onOpenGradebook={handlers.openGradebook} needsHonorific={!teacher?.honorific} onSetHonorific={honorific => saveHonorific(honorific).catch(() => {})} />}
					{view === 'grades' && (
						<GradebookView
							key={gradeFilter} initialFilter={gradeFilter}
							course={course} courses={institution?.courses || []} readOnly={readOnly}
							onSelectCourse={handlers.selectCourse}
							onAddEvaluation={() => openModal('evaluation')}
							onAddStudent={() => openModal('student')}
							onSetGrade={handlers.setGrade}
							onEditStudent={handlers.editStudent}
							onRemoveStudent={handlers.removeStudent}
							onEditEvaluation={id => openModal('evaluation', id)}
							onRemoveEvaluation={handlers.removeEvaluation}
						/>
					)}
					{view === 'calendar' && <CalendarView institutions={data.institutions} teacher={teacher} demo={demo} onOpenCourse={(institutionId, courseId) => handlers.openGradebook('all', institutionId, courseId)} />}
					{view === 'courses' && (
						<CoursesView
							institution={institution} courses={institution?.courses || []} selectedCourseId={course?.id} readOnly={readOnly}
							onAddInstitution={() => openModal('institution')}
							onAddCourse={() => openModal('course')}
							onEditCourse={id => openModal('course', id)}
							onRemoveCourse={handlers.removeCourse}
							onOpenCourse={id => { handlers.selectCourse(id); setView('grades'); }}
						/>
					)}
					{view === 'institutions' && (
						<InstitutionsView
							institutions={data.institutions} selectedInstitutionId={institution?.id}
							onAddInstitution={() => openModal('institution')}
							onEditInstitution={id => openModal('institution', id)}
							onRemoveInstitution={handlers.removeInstitution}
							onOpenInstitution={id => { handlers.selectInstitution(id); setView('courses'); }}
						/>
					)}
					{view === 'profile' && <ProfileView teacher={teacher} user={user} demo={demo} institutions={data.institutions} onExport={exportData} onImport={importData} onSetHonorific={saveHonorific} />}
					<Footer />
				</main>
			</div>
			<MobileNav view={view} onSetView={setViewResettingFilter} />
			<Toast message={toast} />
			{modal && <EntityModal type={modal.type} editing={editingEntity} availableWeight={modal.type === 'evaluation' ? availableWeight(course, modal.editId || undefined) : null} onClose={closeModal} onSubmit={submitModal} />}
			{editingStudent && <StudentRecordModal key={`${editingStudent.id}-${studentModal.tab}`} student={editingStudent} forceRetire={studentModal.forceRetire} initialTab={studentModal.tab} readOnly={readOnly} onClose={() => setStudentModal(null)} onSave={saveStudentRecord} onAddAnnotation={handlers.addAnnotation} onRemoveAnnotation={handlers.removeAnnotation} />}
		</div>
	);
}

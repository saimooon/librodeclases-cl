// Datos del profesor en D1, vía la API del Worker (/api/teacher). El Worker crea el registro con trial
// la primera vez que se consulta, así que no hace falta un paso explícito de "crear documento".
const listeners = new Set();

async function api(path, options = {}) {
	const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
	if (!response.ok) throw new Error(`Error ${response.status} en ${path}`);
	return response.json();
}

const publish = teacher => listeners.forEach(callback => callback(teacher));

// Reemplaza al onSnapshot de Firestore: avisa cada vez que el perfil cambia desde esta app.
export function subscribeTeacher(callback) {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

// Devuelve { teacher, providers } (providers: 'credential' = correo/contraseña, 'google').
export async function fetchTeacher() {
	const result = await api('/api/teacher');
	publish(result.teacher);
	return result;
}

export async function saveTeacherData(_uid, data) {
	await api('/api/teacher/data', { method: 'PUT', body: JSON.stringify({ data }) });
}

// Merge de datos de perfil (opcionales): nombre, correo, teléfono, fecha de nacimiento y foto.
// plan/trialEndsAt no se pueden modificar desde el cliente (el Worker los ignora).
export async function saveTeacherProfile(_uid, { displayName, honorific, email, phoneNumber, birthdate, photoDataUrl } = {}) {
	const { teacher } = await api('/api/teacher/profile', {
		method: 'PATCH',
		body: JSON.stringify({ displayName, honorific, email, phoneNumber, birthdate, photoDataUrl }),
	});
	publish(teacher);
	return teacher;
}

const PAID_PLANS = ['monthly', 'annual', 'lifetime'];

export function planStatus(teacher) {
	if (!teacher) return 'loading';
	if (PAID_PLANS.includes(teacher.plan)) return 'active';
	if (teacher.plan === 'trial' && teacher.trialEndsAt > Date.now()) return 'trial';
	return 'expired';
}

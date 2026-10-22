import { createAuth, socialProviders } from './auth';
import { allEvaluations, emptyData } from '../src/lib/domain';
import { buildIcs } from '../src/lib/calendarExport';

const TRIAL_DAYS = 30;
// Campos de perfil que el cliente puede modificar (plan y trialEndsAt quedan fuera a propósito).
const PROFILE_FIELDS = ['displayName', 'honorific', 'email', 'phoneNumber', 'birthdate', 'photoDataUrl'];
// D1 admite filas de hasta 2 MB; se deja margen para el resto de las columnas.
const MAX_DATA_BYTES = 1_800_000;

const json = (body, status = 200) => Response.json(body, { status });

function rowToTeacher(row) {
	const { data, ...rest } = row;
	return { ...rest, data: JSON.parse(data) };
}

// Devuelve el registro del profesor; lo crea con trial la primera vez que inicia sesión.
async function ensureTeacher(env, user) {
	const existing = await env.DB.prepare('SELECT * FROM teacher WHERE uid = ?').bind(user.id).first();
	if (existing) return rowToTeacher(existing);
	const now = Date.now();
	await env.DB.prepare(
		'INSERT OR IGNORE INTO teacher (uid, email, displayName, photoDataUrl, plan, trialEndsAt, createdAt, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
	).bind(user.id, user.email || null, user.name || null, user.image || null, 'trial', now + TRIAL_DAYS * 86_400_000, now, JSON.stringify(emptyData())).run();
	return rowToTeacher(await env.DB.prepare('SELECT * FROM teacher WHERE uid = ?').bind(user.id).first());
}

// Token aleatorio (192 bits) para el enlace privado del calendario en vivo.
function newCalendarToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Calendario en vivo: Google Calendar (u Outlook/iPhone) lo consulta cada cierto tiempo sin sesión; el token es la llave.
// Un token desconocido o desactivado devuelve un calendario vacío (no un error), para que quien siga
// suscrito a un enlace viejo vea desaparecer las evaluaciones en vez de quedarse con una copia antigua.
async function calendarFeed(env, token, origin) {
	const row = await env.DB.prepare('SELECT data FROM teacher WHERE calendarToken = ?').bind(token).first();
	const items = row ? allEvaluations(JSON.parse(row.data).institutions).sort((a, b) => a.key.localeCompare(b.key)) : [];
	// Sin caché: cada consulta debe reflejar los últimos cambios, y nadie en el camino debe guardar copias.
	return new Response(buildIcs(items, origin), {
		headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, no-store' },
	});
}

async function handleTeacher(request, env, auth, path) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) return json({ error: 'unauthorized' }, 401);
	const { user } = session;

	if (path === '/api/teacher' && request.method === 'GET') {
		const [teacher, accounts] = await Promise.all([
			ensureTeacher(env, user),
			env.DB.prepare('SELECT providerId FROM account WHERE userId = ?').bind(user.id).all(),
		]);
		return json({ teacher, providers: accounts.results.map(item => item.providerId) });
	}

	if (path === '/api/teacher/data' && request.method === 'PUT') {
		const body = await request.json().catch(() => null);
		if (!body?.data || !Array.isArray(body.data.institutions)) return json({ error: 'invalid_data' }, 400);
		const serialized = JSON.stringify(body.data);
		if (new TextEncoder().encode(serialized).length > MAX_DATA_BYTES) return json({ error: 'data_too_large' }, 413);
		await ensureTeacher(env, user);
		await env.DB.prepare('UPDATE teacher SET data = ? WHERE uid = ?').bind(serialized, user.id).run();
		return json({ ok: true });
	}

	if (path === '/api/teacher/profile' && request.method === 'PATCH') {
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') return json({ error: 'invalid_profile' }, 400);
		const fields = PROFILE_FIELDS.filter(field => body[field] !== undefined);
		await ensureTeacher(env, user);
		if (fields.length) {
			await env.DB.prepare(`UPDATE teacher SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE uid = ?`)
				.bind(...fields.map(field => body[field] || null), user.id).run();
		}
		const teacher = await env.DB.prepare('SELECT * FROM teacher WHERE uid = ?').bind(user.id).first();
		return json({ teacher: rowToTeacher(teacher) });
	}

	// Activa o genera un enlace nuevo (POST) o desactiva (DELETE) el calendario en vivo.
	if (path === '/api/teacher/calendar' && (request.method === 'POST' || request.method === 'DELETE')) {
		await ensureTeacher(env, user);
		const token = request.method === 'POST' ? newCalendarToken() : null;
		await env.DB.prepare('UPDATE teacher SET calendarToken = ? WHERE uid = ?').bind(token, user.id).run();
		const teacher = await env.DB.prepare('SELECT * FROM teacher WHERE uid = ?').bind(user.id).first();
		return json({ teacher: rowToTeacher(teacher) });
	}

	return json({ error: 'not_found' }, 404);
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;
		const feed = path.match(/^\/api\/calendar\/([\w-]{16,64})\.ics$/);
		if (feed && request.method === 'GET') return calendarFeed(env, feed[1], url.origin);
		// Proveedores sociales activos, para que el login muestre solo los botones configurados.
		if (path === '/api/auth-config') return json({ socialProviders: Object.keys(socialProviders(env)) });
		const auth = createAuth(env, request);
		if (path.startsWith('/api/auth/')) return auth.handler(request);
		if (path.startsWith('/api/teacher')) return handleTeacher(request, env, auth, path);
		return json({ error: 'not_found' }, 404);
	},

	// Cron diario: marca como "expired" a los profesores cuyo trial venció (antes era la Cloud Function expireTrials).
	// La app también lo valida en el cliente (planStatus); esto mantiene el campo consistente para reportes.
	async scheduled(_controller, env) {
		await env.DB.prepare("UPDATE teacher SET plan = 'expired' WHERE plan = 'trial' AND trialEndsAt <= ?").bind(Date.now()).run();
	},
};

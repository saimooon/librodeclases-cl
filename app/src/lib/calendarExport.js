// Exportación de evaluaciones a calendarios externos: enlace "Agregar a Google Calendar" por evaluación
// y archivo .ics (iCalendar, RFC 5545) para importar en Google Calendar, Outlook o el calendario del iPhone.
// Recibe los items de allEvaluations (domain.js): key = AAAAMMDD, title, type, weight, courseName, institutionName.
// Las evaluaciones no tienen hora, así que son eventos de día completo (sin problemas de zona horaria).

const CALENDAR_NAME = 'Evaluaciones · Libro de Clases';

// Día siguiente en formato AAAAMMDD: en eventos de día completo la fecha de término es exclusiva.
function nextDayKey(key) {
	const date = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)) + 1));
	return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
}

export const eventTitle = item => `${item.title} · ${item.courseName}`;

function eventDetails(item, appUrl) {
	return [
		`Tipo: ${item.type}`,
		`Ponderación: ${item.weight}%`,
		`Curso: ${item.courseName}`,
		`Institución: ${item.institutionName}`,
		'',
		`Registrado en Libro de Clases.cl: ${appUrl}`,
	].join('\n');
}

// Abre Google Calendar con el evento ya completado; la profesora solo confirma con "Guardar".
export function googleCalendarUrl(item, appUrl) {
	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: eventTitle(item),
		dates: `${item.key}/${nextDayKey(item.key)}`,
		details: eventDetails(item, appUrl),
	});
	return `https://calendar.google.com/calendar/render?${params}`;
}

// Escapa texto según RFC 5545 (barra invertida, punto y coma, coma y saltos de línea).
const escapeText = text => String(text ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Las líneas de un .ics no deben superar 75 bytes: se cortan y continúan con un espacio al inicio.
// Se cuenta en bytes UTF-8 para no partir tildes ni eñes por la mitad.
function foldLine(line) {
	const encoder = new TextEncoder();
	const parts = [];
	let current = '';
	let bytes = 0;
	for (const char of line) {
		const size = encoder.encode(char).length;
		if (bytes + size > (parts.length ? 74 : 75)) {
			parts.push(current);
			current = '';
			bytes = 0;
		}
		current += char;
		bytes += size;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

const utcStamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildIcs(items, appUrl) {
	const stamp = utcStamp(new Date());
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Libro de Clases.cl//Evaluaciones//ES',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeText(CALENDAR_NAME)}`,
		// Sugerencia de frecuencia de actualización para calendarios suscritos (Apple/Outlook la respetan; Google decide la suya).
		'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
		'X-PUBLISHED-TTL:PT1H',
		...items.flatMap(item => [
			'BEGIN:VEVENT',
			// UID estable por evaluación: en el calendario en vivo, un cambio de fecha mueve el mismo evento.
			`UID:${item.courseId}-${item.id}@librodeclases.cl`,
			`DTSTAMP:${stamp}`,
			`DTSTART;VALUE=DATE:${item.key}`,
			`DTEND;VALUE=DATE:${nextDayKey(item.key)}`,
			`SUMMARY:${escapeText(eventTitle(item))}`,
			`DESCRIPTION:${escapeText(eventDetails(item, appUrl))}`,
			`CATEGORIES:${escapeText(item.type)}`,
			// Día completo "libre": no bloquea la agenda de la profesora.
			'TRANSP:TRANSPARENT',
			'END:VEVENT',
		]),
		'END:VCALENDAR',
	];
	return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

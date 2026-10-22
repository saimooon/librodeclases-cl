# Libro de Clases.cl — despliegue en Cloudflare

App multi-usuario (React + Cloudflare Workers) para ofrecer el servicio a varias profesoras en modelo freemium
(30 días gratis, luego $3.99 USD/mes, $34.99 USD/año o $99 USD pago único de por vida).

Todo corre en Cloudflare, sin Firebase:

| Pieza | Servicio |
|---|---|
| Frontend (Vite + React) | Workers Static Assets |
| API (`/api/teacher/*`) | Worker en [app/worker/index.js](app/worker/index.js) |
| Login (correo/contraseña, Google opcional) | [Better Auth](https://better-auth.com) dentro del mismo Worker ([app/worker/auth.js](app/worker/auth.js)) |
| Base de datos | D1 `librodeclases` (esquema en [app/migrations](app/migrations)) |
| Tarea diaria (vencer trials) | Cron Trigger del Worker |

## Estructura

- `app/src/` — Frontend.
- `app/worker/` — Worker: rutas `/api/auth/*` (Better Auth) y `/api/teacher*` (datos del profesor), más el cron.
- `app/migrations/` — Migraciones SQL de D1.
- `app/wrangler.jsonc` — Configuración del Worker (nombre, D1, cron, SPA).

## Desarrollo local

```powershell
cd app
npm install
copy .dev.vars.example .dev.vars   # y completar BETTER_AUTH_SECRET (cualquier texto largo aleatorio)
npm run db:migrate:local
npm run dev
```

`npm run dev` levanta Vite con el plugin de Cloudflare: el Worker y una copia local de D1 corren dentro del mismo servidor.

## Primer despliegue

1. `npx wrangler login` (una sola vez).
2. Secretos del Worker:
   ```powershell
   npx wrangler secret put BETTER_AUTH_SECRET
   ```
3. Migraciones en la base remota: `npm run db:migrate:remote`.
4. `npm run deploy` → queda en `https://librodeclases.<tu-subdominio>.workers.dev`.

## Deploy automático (Workers Builds)

En Cloudflare: **Workers & Pages → librodeclases → Settings → Builds → Connect** al repo de GitHub.

- Root directory: `app`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Cada push a `main` publica a producción; las demás ramas generan una URL de vista previa.
Si una versión sale mal: **Workers & Pages → librodeclases → Deployments → Rollback**.

## Dominio propio

Cuando `librodeclases.cl` esté en la cuenta de Cloudflare: **Workers & Pages → librodeclases → Settings →
Domains & Routes → Add → Custom domain** → `librodeclases.cl` (y `www.librodeclases.cl` si se quiere).

## Login con Google (opcional)

1. En Google Cloud Console → APIs y servicios → Credenciales → **ID de cliente OAuth** (Aplicación web).
   - URI de redirección: `https://<dominio>/api/auth/callback/google` (y `http://localhost:5173/api/auth/callback/google` para local).
2. `npx wrangler secret put GOOGLE_CLIENT_ID` y `npx wrangler secret put GOOGLE_CLIENT_SECRET`.
3. Compilar con `VITE_GOOGLE_AUTH=true` (en `app/.env.local` o como variable de build en Workers Builds).

## Modelo de datos

Cada profesor tiene una fila en la tabla `teacher` (D1) con su perfil, su plan (`trial` / `active` / `expired`)
y todo su árbol de instituciones/cursos/estudiantes/notas en la columna `data` (JSON), igual que el documento
`/teachers/{uid}` que había en Firestore. D1 admite filas de hasta 2 MB; el Worker rechaza datos sobre ~1,8 MB.
Las tablas `user`, `session`, `account` y `verification` son de Better Auth.

Las contraseñas se guardan con PBKDF2-SHA256 (WebCrypto nativo) en vez del scrypt por defecto de Better Auth,
para no exceder los 10 ms de CPU por request del plan gratis de Workers.

### Demo pública

`/demo` abre la app con datos de prueba generados en memoria (`app/src/lib/demoData.js`): no requiere cuenta
ni escribe en la base de datos.

### Exportar / importar

- **JSON** (respaldo completo): `{ app, formatVersion, exportedAt, institutions }`. Al importar se valida y
  normaliza la estructura; en modo "agregar" se generan IDs nuevos para no duplicar instituciones/cursos.
  Los respaldos exportados desde Aula Notes se pueden importar igual.
- **CSV / Excel**: una fila por estudiante × evaluación con las columnas de `EXPORT_COLUMNS` (`app/src/lib/domain.js`).

## Pendiente

- Integrar pagos (Stripe o Mercado Pago) con un webhook en el Worker para pasar de `trial` a `active`.
- Recuperación de contraseña por correo: requiere Cloudflare Email Sending (plan Workers Paid) u otro proveedor.
- Migrar los datos de María Jesús desde Aula Notes: exportar JSON en la app vieja e importarlo en la nueva.

# Libro de Clases.cl — despliegue en Cloudflare

App multi-usuario (React + Cloudflare Workers) para ofrecer el servicio a varias profesoras en modelo freemium
(30 días gratis, luego $3.99 USD/mes, $34.99 USD/año o $99 USD pago único de por vida).

Todo corre en Cloudflare, sin Firebase:

| Pieza | Servicio |
|---|---|
| Frontend (Vite + React) | Workers Static Assets |
| API (`/api/teacher/*`) | Worker en [app/worker/index.js](app/worker/index.js) |
| Login (correo/contraseña; Google y Facebook opcionales) | [Better Auth](https://better-auth.com) dentro del mismo Worker ([app/worker/auth.js](app/worker/auth.js)) |
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

`librodeclases.net` (comprado en Cloudflare Registrar) está declarado en `routes` de
[app/wrangler.jsonc](app/wrangler.jsonc) como Custom Domain: al desplegar, Cloudflare crea el registro DNS y el
certificado HTTPS. La dirección `librodeclases.simon-andaurt.workers.dev` sigue funcionando para no romper los
calendarios en vivo que ya se suscribieron con ella.

## Login con Google y Facebook

Cada botón aparece solo cuando el Worker tiene los secretos de ese proveedor (lo consulta en `/api/auth-config`),
así que activarlos no requiere recompilar ni hacer push. Si alguien ya tenía cuenta con el mismo correo, el
login social se vincula a esa cuenta.

URLs de retorno (callback) que hay que registrar en cada proveedor:

- `https://librodeclases.simon-andaurt.workers.dev/api/auth/callback/<google|facebook>`
- `https://librodeclases.net/api/auth/callback/<google|facebook>` (dominio principal)
- `http://localhost:5173/api/auth/callback/<google|facebook>` (desarrollo local)

### Google

1. [Google Cloud Console](https://console.cloud.google.com) → crear proyecto `librodeclases`.
2. **APIs y servicios → Pantalla de consentimiento de OAuth** (Google Auth Platform): tipo *Externo*, nombre
   "Libro de Clases.cl", correo de soporte; luego **Publicar app** para que cualquier cuenta pueda entrar.
3. **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**, con los orígenes
   (`https://librodeclases.net`, `https://librodeclases.simon-andaurt.workers.dev`, …) y las URLs de retorno de arriba.
4. En `app/`:
   ```powershell
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

### Facebook

1. [Meta for Developers](https://developers.facebook.com/apps) → **Crear app** → caso de uso
   *Autenticar y solicitar datos a los usuarios con el inicio de sesión con Facebook*.
2. En el caso de uso, agregar el permiso **email** (además de `public_profile`).
3. **Inicio de sesión con Facebook → Configuración**: pegar las URLs de retorno en *URI de redireccionamiento
   de OAuth válidos*.
4. **Configuración de la app → Básica**: URL de política de privacidad y de eliminación de datos (obligatorias
   para publicar), y copiar el *Identificador de la app* y la *Clave secreta*.
5. Cambiar la app a modo **Publicado** (en modo desarrollo solo pueden entrar los administradores de la app).
6. En `app/`:
   ```powershell
   npx wrangler secret put FACEBOOK_CLIENT_ID
   npx wrangler secret put FACEBOOK_CLIENT_SECRET
   ```

Para probar en local, poner los mismos valores en `app/.dev.vars` y reiniciar `npm run dev`.

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

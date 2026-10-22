# Libro de Clases.cl

Registro de evaluaciones y notas para docentes: instituciones, cursos, estudiantes, calendario de evaluaciones y
libro de notas con promedios y situación de cada estudiante.

- **App:** https://librodeclases.net
- **Stack:** React + Vite, Cloudflare Workers (Static Assets + API), D1 y Better Auth.
- **Código:** todo en [app/](app). El despliegue y la configuración están en [DEPLOY.md](DEPLOY.md).

## Desarrollo local

```powershell
cd app
npm install
copy .dev.vars.example .dev.vars   # completar BETTER_AUTH_SECRET
npm run db:migrate:local
npm run dev
```

Cada push a `main` se publica automáticamente con Workers Builds.

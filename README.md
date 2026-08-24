# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

# ITI Inclusión

Portal institucional para gestionar estudiantes, seguimiento pedagógico, ajustes razonables y reportes.

## Puesta en marcha

1. Copia las variables de entorno:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

2. Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase.
3. Crea los usuarios en Supabase Auth y asigna su rol en `public.profiles`.
4. Ejecuta `npm.cmd run dev`.

Para activar las invitaciones del Administrador, instala y despliega `supabase/functions/invite-user/index.ts` como Edge Function `invite-user`. Supabase proporciona `SUPABASE_SERVICE_ROLE_KEY` solo en el entorno de la función; nunca la pongas en `.env` del frontend.

Sin variables de Supabase, el portal funciona en modo local con `localStorage`, útil para revisar la interfaz y el flujo CRUD. Con las variables configuradas, el login y recuperación usan Supabase Auth; las operaciones de datos están preparadas para conectarse a las tablas definidas en el esquema.

## Funcionalidades

- Roles de Administrador, Docente y Psicólogo/Orientador.
- CRUD de estudiantes con perfil completo y filtros.
- Historial de seguimiento con avances, dificultades y recomendaciones.
- Ajustes razonables, apoyos y estrategias pedagógicas.
- Dashboard con indicadores y distribución por discapacidad.
- Reportes generales y por estudiante mediante CSV e impresión a PDF.

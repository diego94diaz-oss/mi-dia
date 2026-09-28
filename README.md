# 🌅 Mi Día

Dashboard personal unificado de Diego: la información de sus apps
(**Finanzas personales**, **Inversiones/Portafolio**, **Kratos Gym**), la
agenda de Google Calendar, el clima y una lista de pendientes — todo en una
sola pantalla que se abre cada mañana.

**Es una capa de solo lectura/agregación**: no reconstruye ninguna fuente,
lee las que ya existen. La única tabla propia es `tasks` (pendientes).

## Diseño

Tema cálido compartido con Mi Salud (beige + marfil, serifa Newsreader, DM Sans). La banda del saludo cambia de color según la hora y cada área tiene su tono (ver `css/styles.css`). Detalle en `CLAUDE.md` → Historial de cambios.

## Stack

HTML/CSS/JS vanilla (sin build) · supabase-js@2 por CDN · Open-Meteo ·
Google Identity Services + Calendar API · GitHub Pages · PWA
(manifest + service worker, instalable, funciona offline con datos cacheados).

Mismo patrón que `finanzas-personales` y `kratos-gym`: un `index.html`,
config pública en `js/config.js`, cero toolchain.

## Fuentes de datos (detalle en `DATA-SOURCES.md`)

| Card | Fuente | Acceso |
|---|---|---|
| Finanzas | tablas `fin_*` (Supabase compartido) | login Supabase + RLS |
| Inversiones | snapshot `data.json` del bucket privado `dashboard-data` | login Supabase (policy por UUID) |
| Entrenamiento | tablas `workout_sets`/`exercises` de Kratos | login Supabase + RLS |
| Agenda | Google Calendar API (readonly) | OAuth en el navegador (GIS) |
| Correo | Gmail API (readonly) — urgentes de la bandeja Principal | mismo token OAuth que Agenda |
| Clima | Open-Meteo (Lebu, Chile) | público, sin key |
| Pendientes | tabla `tasks` (propia, CRUD) | login Supabase + RLS |
| Salud (mínimo) | `salud_registro` (solo `data->controles`) + última fila de `salud_mediciones` | login Supabase + RLS |

**Barra "Mis apps":** accesos a todo el ecosistema definidos en `config.APPS`
(Finanzas, Inversiones, Inversiones local solo en PC, Kratos, Salud).

Las tres apps comparten **un solo proyecto Supabase**, así que un único
login desbloquea finanzas + inversiones + entrenamiento + tareas.

## Configuración

Todo vive en `js/config.js`:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — clave *publishable* (pública por
  diseño; los datos se protegen con Row Level Security + login).
- `GOOGLE_CLIENT_ID` — OAuth Client ID de Google Cloud (Calendar readonly).
  Orígenes autorizados: `http://127.0.0.1:8742` y
  `https://diego94diaz-oss.github.io`.
- `WEATHER` — coordenadas y zona horaria del clima.
- `LINKS` — enlaces "abrir app completa" de cada card.
- `REFRESH_MIN` — auto-refresh de datos (minutos).

**No hay secretos en el repo**: ni service_role keys ni tokens. La tabla
`tasks` se crea con `alter`/`create` idempotente (RLS `auth.uid() = user_id`),
ver `DATA-SOURCES.md`.

## Desarrollo local

```bash
python -m http.server 8742
# abrir http://127.0.0.1:8742
```

(Sobre `file://` funciona sin service worker; para PWA usar http.)

## Deploy

GitHub Pages del repo `diego94diaz-oss/mi-dia` (branch `main`, root):
https://diego94diaz-oss.github.io/mi-dia/

Al cambiar archivos del shell, subir la versión de `CACHE` en `sw.js`
(`midia-vN`) para que los clientes instalados actualicen.

## Arquitectura

- `js/core.js` — cliente Supabase, auth, registro de widgets, caché
  *stale-while-revalidate* por widget (localStorage), timeout por fuente y
  aislamiento de errores: **una card caída nunca tumba el resto**.
- `js/widgets/*.js` — un archivo por card (`hero`, `finanzas`, `inversiones`,
  `kratos`, `salud`, `agenda`, `correo`, `tareas`). Cada widget define `load()` (datos) y
  `render()` (pintado), y opcionalmente `maxAge` (p. ej. el snapshot de
  inversiones pesa ~3,5 MB y solo se re-descarga cada 30 min; ⟳ fuerza).
- `js/app.js` — arranque, login, auto-refresh (5 min + al volver a la
  pestaña), botón ⟳ y pull-to-refresh táctil.
- Los widgets muestran al instante el último dato cacheado y refrescan en
  segundo plano; sin conexión, la app abre con lo último conocido.

# DATA-SOURCES.md — Descubrimiento Fase 0 (14-07-2026)

Resultado de inspeccionar los repos reales (`diego94diaz-oss/finanzas-personales`,
`diego94diaz-oss/kratos-gym`) y la app local de Inversiones
(`c:\Users\PC\Desktop\Claude\Inversiones`). **Nada de esto es asumido: todo fue
leído del código/esquemas reales.**

## Hallazgo central: UN solo proyecto Supabase para todo

Las tres apps comparten el mismo proyecto Supabase:

- **URL:** `https://ivzzgeoeygggaoazcoeq.supabase.co`
- **Anon/publishable key:** `sb_publishable_G2liTTYj_Ik4LCmh0b2rNw_mPukyFlD`
  (pública por diseño; ambos repos la publican con ese comentario — los datos
  se protegen con RLS + login).
- **Auth:** email + contraseña (usuario: diego94diaz@gmail.com). RLS
  `auth.uid() = user_id` en todas las tablas.

**Consecuencia para Mi Día:** UN solo login (sesión Supabase) desbloquea
Finanzas + Kratos + Inversiones. No se necesitan credenciales nuevas.

---

## Fuente 1 — Finanzas personales

- **Repo/produción:** `diego94diaz-oss/finanzas-personales` (GitHub Pages).
  Vanilla JS, sin build, un solo `index.html`. Cliente: `supabase-js@2` por CDN,
  config en `window.FIN_CONFIG` (inline en el head).
- **Tablas** (patrón documento: cada fila es `{user_id uuid, id text, data jsonb}`,
  upsert `onConflict: "user_id,id"`):
  - `fin_accounts` — `data` = `{id, name, type:"banco"|"efectivo", initial, card?, cupo?, utilizado?, billingDay?}`
  - `fin_transactions` — `data` = `{id, type:"gasto"|"ingreso"|"transferencia", amount, date:"YYYY-MM-DD", account, desc, category}`
  - `fin_debts` — `data` = objeto deuda con `payments[]`
  - `fin_prefs` — una fila por usuario (`onConflict: "user_id"`); `data` =
    `{budgets:{categoria:tope}, emergencyGoal, subsOff, recurring[], catRules[], createdAt, portfolioCLP?, portfolioAt?}`
- **Consultas para el widget** (idénticas a `loadFromCloud()` del repo):
  `from("fin_accounts").select("data").eq("user_id", uid)` etc.
- **Cálculos a portar del repo** (no existen vistas agregadas en Postgres; la app
  calcula en el cliente):
  - Saldo total líquido = Σ `initial` de cuentas no-tarjeta + efecto de
    transacciones (`ingreso` suma, `gasto` resta, `transferencia` mueve entre
    cuentas). Excluir cuentas con `card:true` y "Movimientos internos".
  - Variación vs. ayer = ingresos − gastos con `date` = hoy.
  - Gasto del mes vs. presupuesto = Σ gastos del mes actual vs. Σ `budgets`
    de `fin_prefs`.

## Fuente 2 — Inversiones (portafolio)

- **App:** local Flask+SQLite (`http://127.0.0.1:5613`) — pero para la web NO se
  usa el server local: el PC publica un **snapshot** `data.json` al bucket
  **privado** `dashboard-data` del MISMO Supabase (policy anclada al UUID de
  Diego). Se refresca: diario ~8-9 AM Chile (GitHub Action), tras cada import,
  y con el botón "Actualizar ahora" del dashboard remoto.
- **Acceso (patrón ya probado en producción** — `fetchPortfolio()` del repo de
  finanzas, index.html:836**):**
  ```js
  fetch(SUPABASE_URL + "/storage/v1/object/dashboard-data/data.json?v=" + Date.now(),
        { headers: { apikey: ANON_KEY, Authorization: "Bearer " + session.access_token }})
  ```
- **Estructura del snapshot:** `{generated_at, asof_date, endpoints{...}, transactions_all, price_history, projection_base}`.
  Claves relevantes para el widget (82 endpoints precomputados):
  - `endpoints["/api/summary|currency=CLP"]` → `total_value` (CLP consolidado),
    `total_value_usd`, `gain`, `gain_pct`, `twr_month_pct`, `twr_year_pct`,
    `twr_total_pct`, `fx_rate`, `dist_by_account`…
  - `endpoints["/api/positions|consolidated=1"]` → filas con `ticker, name,
    value, day_change, day_change_pct, return_pct, weight_pct, price_asof` →
    **top movers del día** y variación % diaria del portafolio
    (Σ `day_change` / (Σ `value` − Σ `day_change`)).
  - `generated_at` → mostrar frescura del dato ("sincronizado hace X").
- **Enlace a la app completa:** `https://diego94diaz-oss.github.io/portafolio-dashboard/`
  (misma sesión Supabase para el login de esa página).
- El snapshot pesa ~3,5 MB → cachear en IndexedDB/localStorage y extraer solo
  las 2 claves necesarias; refrescar en background.

## Fuente 3 — Kratos Gym

- **Repo:** `diego94diaz-oss/kratos-gym` (GitHub Pages). Vanilla JS sin build,
  config en `js/config.js` (`window.KRATOS_CONFIG`). Cliente supabase-js@2.
- **Tablas base** (`schema.sql`): `profile`, `exercises` (rutina A/B: `dia`,
  `orden`, `series_obj`, `reps_min/max`, `rir_obj`, `incremento_kg`),
  `workout_sets` (`fecha, rutina, ejercicio, serie, reps, peso_kg, rir`),
  `body_weight`, `measurements`. Fases extra en `db/*.sql`: `sleep_logs`,
  `wellness_logs`, `habits`, `habit_logs`, `cardio_sessions`, `food_logs`,
  `nutrition_targets`, `mesocycles`, `injuries`, `goals`, etc.
- **Consultas para el widget:**
  - `workout_sets` del usuario (últimos ~60 días bastan) → racha de días
    entrenados (fechas distintas), última sesión, PRs recientes (1RM Epley:
    `peso × (1 + reps/30)` — portar de `js/logic.js`).
  - Rutina de HOY = rotación A/B, port de `Logic.nextDay()` (logic.js:9): si la
    última fecha entrenada fue rutina A → hoy toca B, y viceversa; sin
    historial → A. Si ya hay sets con fecha de hoy → mostrar "ya entrenaste
    (rutina X)".
  - `exercises` con `dia = rutina de hoy`, `activo = true`, orden por `orden` →
    lista de ejercicios del día.
- **⚠️ Orden inverso:** `DB.getSets()` ordena `fecha` DESCENDENTE — el primer
  item del array es la ÚLTIMA serie realizada. Cuidado al mostrar "última serie".

## Fuente 4 — Google Calendar

- Cuenta: diego94diaz@gmail.com. OAuth en el navegador con Google Identity
  Services + Calendar API readonly (`calendars/primary/events`, próximas 48 h).
- **Client ID creado el 14-07-2026** (proyecto GCP "mi-dia", app en modo
  prueba con Diego como test user): configurado en `js/config.js`. Orígenes
  autorizados: `http://127.0.0.1:8742` y `https://diego94diaz-oss.github.io`.
- El access token (~1 h) se cachea en localStorage; al expirar se renueva
  silencioso (`prompt:"none"`) y si Google exige interacción la card muestra
  el botón "Conectar Google".

## Fuente 5 — Clima

- **Open-Meteo** (`https://api.open-meteo.com/v1/forecast`): sin API key, CORS
  abierto, gratis. Variables: `temperature_2m`, `weather_code`,
  `temperature_2m_max/min` diarios. Ubicación: PREGUNTA ABIERTA (fija vs.
  geolocalización del navegador).

## Fuente 6 — Tareas / pendientes

- **No existe backend de tareas** en ninguna de las apps → crear tabla mínima
  en el MISMO proyecto Supabase, siguiendo el patrón RLS de kratos:
  ```sql
  create table if not exists tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    texto text not null,
    done boolean default false,
    due date,
    created_at timestamptz default now()
  );
  -- + enable RLS + policy own_tasks (auth.uid() = user_id)
  ```

## Fuente 7 — Home Assistant (opcional)

- No se encontró instalación/URL en los repos. PREGUNTA ABIERTA; si no está
  disponible, la card se omite sin romper nada (así lo pide el spec).

## Fuente 8 — Gmail (correos urgentes) — agregada 14-07-2026

- **Gmail API readonly** directo desde el navegador, con el MISMO token OAuth
  de la Agenda (módulo compartido `js/google.js`, scopes combinados
  `calendar.readonly` + `gmail.readonly`; un solo consentimiento).
- Consulta: `users/me/messages?q=in:inbox category:primary newer_than:7d`
  (máx. 25) y `messages.get format=metadata` (From/Subject/Date) para los
  primeros 15. Promociones/social quedan fuera por `category:primary`.
- **Urgencia por heurística** (sin IA): STARRED +3, IMPORTANT +2, UNREAD +2;
  top 5 con puntaje ≥ 2, orden por puntaje y recencia. Cada fila enlaza a
  `mail.google.com/mail/u/0/#inbox/<id>` para responder al tiro.
- Si el token guardado es de la versión solo-calendar (401/403), se borra y
  ambas cards vuelven a "Conectar Google".

---

## Decisión de stack (alineada a las apps existentes)

Ambas apps productivas son **vanilla JS sin build, un HTML + módulos JS planos,
supabase-js por CDN, GitHub Pages, PWA con manifest + sw.js**. Mi Día seguirá
exactamente ese patrón (sin Vite/React): consistencia, cero toolchain, deploy
directo. Config en `js/config.js` con URL + anon key públicas (mismo criterio
comentado en ambos repos); ningún secreto en el repo.

## Decisiones tomadas (14-07-2026, confirmadas por Diego)

1. **Google Calendar:** Client ID OAuth creado y configurado (ver Fuente 4).
2. **Clima:** ubicación fija **Lebu, Chile** (-37.6083, -73.6533).
3. **Home Assistant:** se omite la card de hogar (no hay instancia).
4. **Repo:** `diego94diaz-oss/mi-dia` → https://diego94diaz-oss.github.io/mi-dia/
5. **Tabla `tasks`:** creada el 14-07-2026 en el proyecto compartido vía
   Management API (RLS `own_tasks`, índice `idx_tasks_user`).

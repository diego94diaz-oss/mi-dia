# CLAUDE.md — Mis Apps (antes «Mi Día»): dashboard y puerta de entrada del ecosistema

> Reglas globales y mapa del ecosistema: `../CLAUDE.md` y `../memory.md`. Fuentes de datos y contratos: `DATA-SOURCES.md`.
> (El prompt inicial con el que se construyó la app en 2026-09 se reemplazó el 2026-11-07 por esta descripción del
> estado real; el original está en el historial de git.)

## Qué es

PWA vanilla JS (sin build) que Diego abre cada mañana: saludo + clima, cards de Finanzas, Inversiones, Entrenamiento,
Agenda (Google Calendar), Correo (Gmail), Salud (solo 3 datos), Viajes y Pendientes (tabla `tasks`), y la barra
«Mis apps» con acceso a todo el ecosistema. Es una capa de **solo lectura** sobre las otras apps (salvo `tasks`).

- **Producción:** https://mis-apps.diego94diaz.workers.dev/ (Cloudflare Workers, Worker `mis-apps`, desde 2026-11-07).
  La dirección antigua `diego94diaz-oss.github.io/mi-dia/` sigue funcionando (GitHub Pages publica el mismo repo) hasta que Diego decida.
- **Repo:** `diego94diaz-oss/mi-dia` (público). Pendiente de decisión de Diego: pasarlo a un repo privado y dejar en GitHub Pages solo una redirección.
- **Publicar:** desde esta carpeta, `npx wrangler deploy` (assets estáticos; `.assetsignore` excluye docs y `brand-source.png`).
  Si en el panel de Cloudflare se conecta el repo (Workers Builds), cada push a `main` publica solo.

## Arquitectura

| Pieza | Dónde |
|---|---|
| Configuración (Supabase publicable, Client ID de Google, clima, enlaces, barra de apps) | `js/config.js` |
| Cliente Supabase, caché por widget (stale-while-revalidate en `localStorage`, prefijo `midia_`), login, salto con sesión | `js/core.js` |
| Token de Google (Calendar readonly + **Gmail metadata**) | `js/google.js` |
| Un archivo por card | `js/widgets/*.js` |
| Arranque, login, barra «Mis apps» | `js/app.js` |
| supabase-js con versión fija (no CDN) | `vendor/supabase-2.118.0.js` |
| Service worker: caché primero y actualización en segundo plano | `sw.js` (subir `CACHE` al cambiar el shell) |
| Encabezados de seguridad (CSP) | `_headers` (si se agrega un servicio externo, sumarlo ahí) |

## Reglas

- **Login único (desde 2026-11-07):** con sesión iniciada, cada acceso de la barra pide a la función `portafolio-sso`
  (Inversiones, `app/publish.py`, `SSO_DESTINOS`) un enlace con código de un solo uso y abre la app ya con sesión.
  Las apps destino lo canjean con `verifyOtp` (`#sso=`). Accesos con `sso: false` (Calculadora) se abren directo.
  Al agregar una app con login: sumar su destino en `SSO_DESTINOS`, redesplegar la función y agregar el canje en esa app.
- **Gmail con permiso `gmail.metadata`:** solo remitente, asunto, fecha y etiquetas; ese permiso no admite `q=`, por eso
  `correo.js` filtra por etiquetas (`INBOX` + `CATEGORY_PERSONAL`) y la fecha en el navegador. No volver a `gmail.readonly`.
- **Cerrar sesión** borra toda la caché `midia_*` (montos, peso, presión, asuntos) y el token de Google.
- **Salud:** solo 3 datos mínimos (ADR-004). No leer el registro clínico completo.
- **Google Cloud:** el Client ID «mi-dia» debe tener como origen autorizado `https://mis-apps.diego94diaz.workers.dev`.
- No hay secretos en el repo (la clave de Supabase es la publicable).

## Historial de cambios (mantener al día en cada sesión)

### 2026-09-28 — Mi Día como puerta de entrada del ecosistema
- **Barra "Mis apps"** bajo el clima (`#apps`, render en `js/app.js`
  `renderApps()`, lista en `config.APPS`): Finanzas, Inversiones, Inversiones
  local (solo PC, se oculta en celular), Kratos y Salud. Para agregar una app
  al ecosistema basta con sumarla a `config.APPS`.
- **Card Salud** (`js/widgets/salud.js`): solo 3 datos por decisión de Diego:
  próximo control, último peso y última presión. Lee `data->controles` de
  `salud_registro` y la última fila de `salud_mediciones`; no baja el registro
  clínico completo. Contrato: `controles[] = {fecha, texto, aprox}` (lo
  mantiene el agente de `Salud/`).
- **Enlace de Inversiones** corregido a `https://mis-inversiones.github.io/`
  (el anterior `portafolio-dashboard` solo redirigía).
- Service worker `midia-v5`.
- ~~Pendiente: rediseño~~ → hecho el mismo día (ver abajo).

### 2026-09-28 — Card Salud con citas reales
- Lee también `salud_citas` (citas que Diego agenda en Mi Salud) y muestra lo
  más cercano entre esas citas (con hora y lugar) y los controles sugeridos
  que aún no tienen cita (`control_id`). Indica "Próxima cita" o "Control
  sugerido (sin agendar)". Service worker `midia-v6`.

### 2026-09-28 — Rediseño (Diego: "se ve muy apagado y poco original")
- Misma base visual que Mi Salud para que el ecosistema se vea como un solo
  sistema: fondo cálido `#eee5d7`, tarjetas marfil `#fffbf5`, títulos con
  serifa (Newsreader) y texto en DM Sans (Google Fonts).
- Identidad propia: **banda del saludo cuyo color cambia con la hora**
  (`body[data-momento]` = manana | tarde | noche, lo fija `hero.js`), con reloj
  y clima dentro; de noche el clima despejado muestra luna (`is_day` de
  Open-Meteo).
- **Un tono por área** (variables `--tone*` por `#w-<id>` en `css/styles.css`):
  Finanzas verde, Inversiones azul, Entrenamiento terracota, Agenda sol,
  Correo rosa, Salud lavanda, Pendientes arena. La barra "Mis apps" usa los
  mismos tonos (clase `app-<id>`, la agrega `renderApps()`).
- Íconos de card en `<span class="h2-ico">`; ícono de la app nuevo (sol).
  Service worker `midia-v7`.
- Al agregar una card nueva: darle su tono en `css/styles.css` (`#w-<id> { --tone-s/--tone/--tone-i }`).

### 2026-09-28 — Barra "Mis apps" sin Inversiones local
- Diego pidió quitar "Inversiones (en este PC)": la barra queda con Finanzas,
  Inversiones, Kratos y Salud. El soporte `soloPC` sigue en el código por si
  se necesita otro acceso solo para el computador. Service worker `midia-v8`.


### 2026-10-30 — Viajes (Travel Manager)
- Barra "Mis apps" suma **Viajes** (`config.APPS`, `LINKS.viajes`, ícono `icons/viajes.png`).
- Card **Viajes** (`js/widgets/viajes.js`, tono azul): viaje en curso o siguiente y próximo vuelo.
  Solo lectura de `tm_trips` y `tm_flights`; no lee códigos de reserva. Contrato en `DATA-SOURCES.md`.
- La app vive en https://mis-viajes.github.io/ (origen propio, login aparte).
- Caché del shell `midia-viajes-20261030b`.

### PENDIENTE (2026-09-28) — Google (Gmail/Calendar) siempre conectado
- **Causa diagnosticada:** `js/google.js` usa el flujo implícito de GIS: el
  access token dura ~1 h y la renovación silenciosa (`prompt:"none"`) abre un
  popup que el navegador bloquea sin gesto del usuario → vuelve "Conectar Google".
- **Plan acordado a implementar:** flujo con código de autorización
  (`initCodeClient`, `access_type=offline`) + edge function de Supabase que
  guarda el refresh token del lado del servidor (tabla sin acceso de cliente) y
  entrega access tokens nuevos a Mi Día sin popups.
- **Reusar el patrón de Inversiones** (`Inversiones/app/publish.py`:
  `_deploy_function`, validación con `/auth/v1/user`). OJO: los secrets de
  edge functions son GLOBALES del proyecto compartido → usar prefijo
  `MIDIA_GOOGLE_*`.
- **Requiere a Diego:** (1) poner el *client secret* del OAuth "mi-dia" como
  secret en Supabase (sin pegarlo en el chat); (2) pasar la pantalla de
  consentimiento de Google Cloud de "Prueba" a "En producción" (en modo prueba
  los refresh tokens caducan a los 7 días).


### 2026-10-01 — Nombres y logos del ecosistema
Identidad actual (2026-11-07): íconos vectoriales con una misma línea visual (cuadrado redondeado, degradado del tono de la app, glifo blanco con sombra) y un color distinto por app: Mis Apps violeta, Inversiones azul, Viajes turquesa, Finanzas verde, Calculadora ámbar, Entrenamiento naranja y Salud rosa. Se generan con `iconos/generar_iconos.py` en la raíz del ecosistema (`Desktop\Claude\iconos\`, ver su README): no editar los PNG a mano. El logo 3D anterior queda en el historial de git. Se conservan URLs e identificadores internos para mantener instalaciones, datos y sesiones.

### 2026-11-07 — Carpeta renombrada «Mi Día» → «Mis Apps»
Pedido de Diego. Solo cambió la carpeta local y las rutas en los docs del ecosistema; la URL `diego94diaz-oss.github.io/mi-dia`, el repo `mi-dia` y los identificadores internos se mantienen.

### 2026-11-07 — Finanzas cambió de dirección
Finanzas se mudó a Cloudflare: el enlace de la barra (`js/config.js`) apunta ahora a https://finanzas.diego94diaz.workers.dev/. Caché del shell `midia-finanzas-cf-20261107`. Las tablas `fin_*` que lee el widget no cambiaron.

### 2026-11-07 — Viajes cambió de dirección
El enlace de Viajes en `js/config.js` apunta a https://viajes.diego94diaz.workers.dev/ (Cloudflare). Caché del shell `midia-viajes-cf-20261107`. Las tablas `tm_*` que lee el widget no cambiaron.

### 2026-11-07 — Título de la card Agenda
La card de agenda (`index.html`, `#w-agenda`) se titula ahora «Agenda de hoy». Caché del shell `midia-agenda-titulo-20261107`.

- **2026-11-07 — Ícono nuevo:** Violeta, cuatro bloques, con una misma línea visual que el resto del ecosistema y color propio (ver `Desktop\Claude\iconos\README.md`). Se regenera con `python iconos/generar_iconos.py` desde la raíz; no editar los PNG a mano. Los accesos de la barra `icons/*.png` usan el ícono nuevo de cada app. Caché del SW: `midia-iconos-20261107`.

- **2026-11-07 — respaldo semanal (desde 2026-11-07): `Desktop\Claude\respaldo-supabase.py` copia al PC todas las tablas con columna `user_id` (y `tm_sharing`). **Una tabla personal nueva entra sola si tiene `user_id`**; si no lo tiene, agregarla a `TABLAS_EXTRA` del script. Detalle en `memory.md` de la raíz («Respaldo de datos»). Incluye la tabla `tasks`.

### 2026-11-07 — Mudanza a Cloudflare, login único y seguridad
- Publicada en **https://mis-apps.diego94diaz.workers.dev/** con `_headers` (CSP). El repo sigue siendo `mi-dia` (público) y
  GitHub Pages sigue sirviendo la dirección antigua: el paso a repo privado quedó para que lo apruebe Diego.
- Barra «Mis apps»: abre cada app con sesión (portafolio-sso) y suma la **Calculadora** (`icons/calculadora.png`).
- Gmail pasa a `gmail.metadata` (hay que volver a pulsar «Conectar Google» una vez). Cerrar sesión limpia la caché.
- supabase-js propio en `vendor/`; SW con caché primero (`misapps-swr-20261107`).
- **Falta (Diego):** en Google Cloud → Credenciales → Client ID «mi-dia», agregar el origen
  `https://mis-apps.diego94diaz.workers.dev`; sin eso Agenda y Correo no conectan en la dirección nueva.

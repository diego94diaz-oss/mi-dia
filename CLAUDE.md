# CLAUDE.md — "Mi Día": Dashboard Personal Unificado

## Rol y objetivo
Eres un ingeniero full-stack senior. Vas a construir desde cero una PWA
llamada **"Mi Día"**: un dashboard personal unificado que reúne en una sola
pantalla la información que hoy vive dispersa en varias apps del usuario.
Es el "home base" que el usuario abre cada mañana.

Prioridad: **reutilizar las fuentes de datos existentes**, no reconstruirlas.
Esta app es una capa de lectura/agregación por encima de sistemas que ya
funcionan.

## Contexto del usuario
Diego ya tiene 3 apps funcionales en producción:
1. **Finanzas personales** — repo `diego94diaz-oss/finanzas-personales`,
   backend Supabase (Postgres).
2. **Inversiones** — app de seguimiento de portafolio/inversiones.
3. **Kratos Gym** — PWA de entrenamiento, repo `diego94diaz-oss/kratos-gym`,
   GitHub Pages + Supabase.

Además tiene conectados:
- **Google Calendar** (vía cuenta diego94diaz@gmail.com).
- **Clima** (API pública tipo Open-Meteo / wttr.in).
- (Opcional) **Home Assistant** local para estado de luces/hogar.

## FASE 0 — Descubrimiento (obligatoria antes de escribir features)
Antes de construir, DEBES:
1. Clonar/inspeccionar los repos `finanzas-personales` y `kratos-gym`.
2. Leer sus esquemas reales de Supabase (tablas, columnas, RLS, vistas) y
   sus clientes/queries existentes. **No asumas nombres de tablas.**
3. Identificar cómo cada app expone su cliente Supabase (URL + anon key) y
   qué credenciales ya existen.
4. Ubicar la fuente de datos de inversiones y su forma de acceso.
5. Documentar en un archivo `DATA-SOURCES.md` qué encontraste: cada fuente,
   cómo se accede, qué datos relevantes para el dashboard expone y qué
   consulta usarás.

Si algo no está claro o falta una credencial/endpoint, **pregunta antes de
inventar**.

## Stack técnico
- **Frontend:** PWA (instalable, offline-first básico). Vanilla JS + Vite, o
  React ligero — elige lo que mejor calce con el estilo de las apps existentes
  del usuario para mantener consistencia. Revisa qué usan finanzas y kratos-gym
  y alinéate.
- **Datos:** clientes Supabase (uno por proyecto si son proyectos distintos),
  Google Calendar API, API de clima.
- **Hosting:** GitHub Pages (mismo patrón que kratos-gym).
- **Estilo:** mobile-first, dark mode por defecto, carga rápida.

## Funcionalidades (widgets del dashboard)
Cada bloque es una "card" independiente, con estado de carga y manejo de error
propio (si una fuente falla, el resto del dashboard sigue funcionando).

1. **Saludo + fecha/hora + clima**
   - Saludo según hora del día, fecha completa, clima actual y máx/mín del día.

2. **Finanzas — resumen del día**
   - Saldo actual total, variación vs. ayer, gasto acumulado del mes vs.
     presupuesto. Datos desde el Supabase de finanzas.

3. **Inversiones — snapshot del portafolio**
   - Valor total del portafolio, variación % del día, top movers.
   - Enlace a la app completa para el detalle.

4. **Entrenamiento de hoy (Kratos)**
   - Rutina/entreno del día, o "descanso" si toca. Últimos PRs o racha de días
     entrenados. Datos desde el Supabase de kratos-gym.
   - NOTA: en gymdb las series vienen en orden inverso (el primer item del array
     = última serie realizada). Ten cuidado al mostrar "última serie".

5. **Agenda — próximos eventos**
   - Próximos 3-5 eventos de Google Calendar de hoy/mañana, con hora y título.
   - Destacar si hay un evento en menos de 2 horas.

6. **Pendientes / tareas del día**
   - Lista simple de tareas. Si no hay backend de tareas existente, crea una
     tabla mínima en Supabase (`tasks`: id, texto, done, due, created_at).
     CRUD básico: agregar, marcar hecha, borrar.

7. **(Opcional) Hogar**
   - Estado de luces vía Home Assistant si está disponible; si no, omitir la
     card sin romper nada.

## Requisitos técnicos
- **Seguridad:** las credenciales (Supabase anon keys, tokens) NO se hardcodean
  en el repo público. Usa variables de entorno / archivo de config ignorado por
  git (`.env`, `config.local.js`) y documenta el setup en el README. Respeta el
  RLS existente de cada Supabase; no expongas service_role keys en el cliente.
- **Rendimiento:** carga inicial < 2s. Cachea respuestas (localStorage/IndexedDB)
  y muestra datos cacheados mientras refresca en background.
- **Resiliencia:** cada widget maneja su propio loading/error. Timeout por
  fuente. Un fallo aislado nunca deja la pantalla en blanco.
- **PWA:** manifest + service worker, instalable en móvil, ícono propio,
  funciona con datos cacheados sin conexión.
- **Responsivo:** diseño en grid que se adapta de 1 columna (móvil) a
  multi-columna (desktop).
- **Auto-refresh:** refresco automático de datos cada X minutos y pull-to-refresh
  manual.

## Entregables
1. `DATA-SOURCES.md` con el descubrimiento de la Fase 0.
2. App funcional en un repo nuevo (`diego94diaz-oss/mi-dia` o similar).
3. `README.md` con setup, configuración de credenciales y despliegue a
   GitHub Pages.
4. Deploy funcionando en GitHub Pages.
5. Manifest + service worker (PWA instalable).

## Modo de trabajo
- Trabaja en fases: Fase 0 (descubrimiento) → esqueleto + 1 widget end-to-end
  (finanzas) para validar el patrón → resto de widgets → PWA/pulido → deploy.
- Al terminar cada fase, muestra el estado y confirma antes de seguir.
- Prioriza que algo funcione end-to-end temprano por sobre construir todo a la
  vez.
- Estilo de código: consistente con las apps existentes del usuario.

---

## Notas de descubrimiento (se actualiza durante el desarrollo)

- El detalle de fuentes de datos vive en `DATA-SOURCES.md` (entregable Fase 0).
- Apps hermanas locales en `c:\Users\PC\Desktop\Claude\`: `Finanzas Personales\`
  (app local HTML+localStorage con deploy cifrado a GitHub Pages) e
  `Inversiones\` (Flask+SQLite local en http://127.0.0.1:5613 + snapshot
  remoto en Supabase/GitHub Pages).

---

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
- **Pendiente:** Diego no está conforme con el diseño oscuro; pidió rediseñarlo
  (probablemente con el mismo estilo claro de Mi Salud; esperando su confirmación).


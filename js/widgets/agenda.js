// ============================================================
//  WIDGET: Agenda — próximos eventos de Google Calendar.
//  Usa Google Identity Services (token OAuth en el navegador,
//  scope readonly). Requiere GOOGLE_CLIENT_ID en config.js;
//  sin él, la card muestra el aviso de setup y no rompe nada.
//  El access token (~1 h) se cachea en localStorage.
// ============================================================
(() => {
  const C = window.MIDIA_CONFIG;
  const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
  const TK = "midia_gcal_token";

  let gisReady = null;
  function loadGIS() {
    if (gisReady) return gisReady;
    gisReady = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = res; s.onerror = () => rej(new Error("no se pudo cargar GIS"));
      document.head.appendChild(s);
    });
    return gisReady;
  }

  function savedToken() {
    try {
      const t = JSON.parse(localStorage.getItem(TK) || "null");
      return t && t.exp > Date.now() + 60000 ? t.token : null;
    } catch (e) { return null; }
  }

  // interactive=true solo desde el botón "Conectar" (gesto del usuario)
  async function getToken(interactive) {
    const saved = savedToken();
    if (saved) return saved;
    await loadGIS();
    return new Promise((res, rej) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: C.GOOGLE_CLIENT_ID,
        scope: SCOPE,
        hint: "diego94diaz@gmail.com",
        callback: t => {
          if (t.error) { rej(new Error(t.error)); return; }
          try { localStorage.setItem(TK, JSON.stringify({ token: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 })); } catch (e) {}
          res(t.access_token);
        }
      });
      tc.requestAccessToken({ prompt: interactive ? "" : "none" });
      if (!interactive) setTimeout(() => rej(new Error("token silencioso no disponible")), 8000);
    });
  }

  window.MiDiaAgenda = {
    async connect() {
      try { await getToken(true); Core.refreshOne("agenda"); }
      catch (e) { console.warn("gcal connect", e); }
    }
  };

  function fmtHora(ev) {
    const s = ev.start?.dateTime || ev.start?.date;
    if (!ev.start?.dateTime) return "todo el día";
    return new Date(s).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDia(ev) {
    const s = ev.start?.dateTime || ev.start?.date;
    const d = new Date(ev.start?.dateTime || (s + "T12:00:00"));
    const hoy = new Date(); const man = new Date(Date.now() + 86400000);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, hoy)) return "hoy";
    if (same(d, man)) return "mañana";
    return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" });
  }

  Core.register({
    id: "agenda",
    needsAuth: false,   // auth propia (Google), no Supabase
    async load() {
      if (!C.GOOGLE_CLIENT_ID) return { setup: true };
      let token;
      try { token = await getToken(false); }
      catch (e) { return { connect: true }; }
      const now = new Date().toISOString();
      const max = new Date(Date.now() + 48 * 3600000).toISOString();
      const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
        `?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(max)}` +
        `&singleEvents=true&orderBy=startTime&maxResults=5`;
      const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
      if (r.status === 401) { localStorage.removeItem(TK); return { connect: true }; }
      if (!r.ok) throw new Error("gcal " + r.status);
      const d = await r.json();
      return { events: (d.items || []).map(ev => ({
        titulo: ev.summary || "(sin título)",
        hora: fmtHora(ev), dia: fmtDia(ev),
        startMs: ev.start?.dateTime ? new Date(ev.start.dateTime).getTime() : null
      })) };
    },
    render(el, d) {
      if (d.setup) {
        el.innerHTML = `<div class="w-msg">Falta configurar el <b>Client ID de Google</b> en
          <code>js/config.js</code> para ver tu agenda.</div>`;
        return;
      }
      if (d.connect) {
        el.innerHTML = `<div class="w-msg">Conecta tu Google Calendar (solo lectura).</div>
          <button class="btn-sm" onclick="MiDiaAgenda.connect()">Conectar Google</button>`;
        return;
      }
      if (!d.events.length) {
        el.innerHTML = `<div class="w-msg">Sin eventos en las próximas 48 horas. 🌴</div>`;
        return;
      }
      el.innerHTML = `<div class="list">` + d.events.map(ev => {
        const pronto = ev.startMs && ev.startMs - Date.now() < 2 * 3600000 && ev.startMs > Date.now();
        return `<div class="list-item${pronto ? " soon" : ""}">
          <span class="num muted" style="min-width:74px">${ev.dia} ${ev.hora}</span>
          <span class="grow">${Core.esc(ev.titulo)}</span>
          ${pronto ? `<span class="chip neg">¡pronto!</span>` : ""}</div>`;
      }).join("") + `</div>`;
    }
  });
})();

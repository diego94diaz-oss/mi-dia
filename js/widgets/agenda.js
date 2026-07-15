// ============================================================
//  WIDGET: Agenda — próximos eventos de Google Calendar.
//  Auth vía MiDiaGoogle (token compartido con la card Correo).
//  Sin GOOGLE_CLIENT_ID muestra el aviso de setup y no rompe.
// ============================================================
(() => {

  window.MiDiaAgenda = {
    connect() { MiDiaGoogle.connectAnd(["agenda", "correo"]); }
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
      if (!MiDiaGoogle.configured()) return { setup: true };
      const now = new Date().toISOString();
      const max = new Date(Date.now() + 48 * 3600000).toISOString();
      const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
        `?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(max)}` +
        `&singleEvents=true&orderBy=startTime&maxResults=5`;
      let d;
      try { d = await MiDiaGoogle.gfetch(url, false); }
      catch (e) { return { connect: true }; }
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

// ============================================================
//  WIDGET: Kratos — entrenamiento de hoy, racha y PRs.
//  Lee workout_sets y exercises del Supabase compartido.
//  Rutina de hoy = port de Logic.nextDay() de kratos-gym
//  (rotación A/B según la última sesión registrada).
//  ⚠ Los sets se piden por fecha DESC: el primer item del array
//  es la ÚLTIMA serie realizada (peculiaridad documentada).
// ============================================================
(() => {
  const epley = (peso, reps) => reps > 0 ? peso * (1 + reps / 30) : 0;
  const iso = d => d.toISOString().slice(0, 10);

  Core.register({
    id: "kratos",
    needsAuth: true,
    async load() {
      const sb = Core.sb(), u = Core.uid();
      const desde = iso(new Date(Date.now() - 90 * 86400000));
      const [setsRes, exRes] = await Promise.all([
        sb.from("workout_sets").select("fecha,rutina,ejercicio,serie,reps,peso_kg")
          .eq("user_id", u).gte("fecha", desde)
          .order("fecha", { ascending: false }).order("created_at"),
        sb.from("exercises").select("nombre,dia,orden,activo")
          .eq("user_id", u).eq("activo", true).order("dia").order("orden")
      ]);
      if (setsRes.error) throw setsRes.error;
      if (exRes.error) throw exRes.error;
      const sets = setsRes.data || [], exs = exRes.data || [];

      const hoy = Core.todayStr();
      const fechas = [...new Set(sets.map(s => s.fecha))].sort();   // ascendente
      const lastFecha = fechas[fechas.length - 1];

      // Rotación A/B (port fiel de Logic.nextDay)
      const lastRutina = (sets.find(s => s.fecha === lastFecha) || {}).rutina;
      const proxima = !fechas.length ? "A" : (lastRutina === "A" ? "B" : "A");

      const setsHoy = sets.filter(s => s.fecha === hoy);
      const entrenoHoy = setsHoy.length > 0;
      const rutinaHoy = entrenoHoy ? setsHoy[0].rutina : proxima;
      const ejerciciosHoy = exs.filter(e => e.dia === rutinaHoy).map(e => e.nombre);

      // Días entrenados últimos 7 días + última sesión
      const hace7 = iso(new Date(Date.now() - 6 * 86400000));
      const dias7 = fechas.filter(f => f >= hace7).length;

      // PRs de los últimos 14 días: mejor 1RM estimado vs. lo anterior
      const hace14 = iso(new Date(Date.now() - 13 * 86400000));
      const best = {}, prs = [];
      for (const s of [...sets].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
        const rm = epley(s.peso_kg, s.reps);
        if (rm > (best[s.ejercicio] || 0)) {
          if (s.fecha >= hace14 && best[s.ejercicio]) prs.push({ ej: s.ejercicio, rm, fecha: s.fecha });
          best[s.ejercicio] = rm;
        }
      }
      const prsRecientes = prs.slice(-2).reverse();

      return { entrenoHoy, rutinaHoy, nSetsHoy: setsHoy.length, ejerciciosHoy,
               dias7, lastFecha, prs: prsRecientes };
    },
    render(el, d, t) {
      const lista = d.ejerciciosHoy.slice(0, 4).map(e =>
        `<div class="list-item"><span class="grow">${Core.esc(e)}</span></div>`).join("") +
        (d.ejerciciosHoy.length > 4 ? `<div class="small muted">+${d.ejerciciosHoy.length - 4} más</div>` : "");
      const estado = d.entrenoHoy
        ? `<div class="chip pos">✔ Ya entrenaste hoy · Rutina ${Core.esc(d.rutinaHoy || "?")} (${d.nSetsHoy} series)</div>`
        : `<div class="metric-big" style="font-size:22px">Hoy toca Rutina ${Core.esc(d.rutinaHoy)}</div>`;
      const prs = d.prs.length ? `<div class="small muted">PRs recientes: ` +
        d.prs.map(p => `${Core.esc(p.ej)} (${Math.round(p.rm)} kg 1RM est.)`).join(" · ") + `</div>` : "";
      el.innerHTML = `
        ${estado}
        ${!d.entrenoHoy && d.ejerciciosHoy.length ? `<div class="list">${lista}</div>` : ""}
        <div class="row-split">
          <div><small>Últimos 7 días</small><b>${d.dias7} ${d.dias7 === 1 ? "día" : "días"} entrenados</b></div>
          <div><small>Última sesión</small><b>${d.lastFecha ? Core.esc(d.lastFecha) : "—"}</b></div>
        </div>
        ${prs}
        <div class="card-foot"><span class="muted small">${Core.timeAgo(t)}</span>
          <a href="${window.MIDIA_CONFIG.LINKS.kratos}" target="_blank" rel="noopener">Abrir Entrenamiento →</a></div>`;
    }
  });
})();

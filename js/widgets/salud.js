// ============================================================
//  WIDGET: Salud — datos MÍNIMOS de la app Mi Salud (decisión de
//  Diego, 28-09-2026): próximo control, último peso y última presión.
//  Lee del Supabase compartido:
//   - salud_registro: SOLO data->controles (no se baja el registro
//     clínico completo; la caché local guarda solo estos 3 datos).
//   - salud_mediciones: última fila de peso y de presión.
//  El detalle clínico vive únicamente en Mi Salud.
// ============================================================
(() => {
  const fmt = s => {
    if (!s) return "—";
    const [y, m, d] = s.split("-");
    return d ? `${d}-${m}-${y}` : `${m}-${y}`;
  };
  const dias = s => {
    const [y, m, d] = s.split("-").map(Number);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d || 1) - hoy) / 86400000);
  };

  Core.register({
    id: "salud",
    needsAuth: true,
    async load() {
      const sb = Core.sb(), u = Core.uid();
      const ultima = tipo => sb.from("salud_mediciones").select("fecha,valor,sistolica,diastolica")
        .eq("user_id", u).eq("tipo", tipo)
        .order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(1);
      const [regRes, pesoRes, paRes] = await Promise.all([
        sb.from("salud_registro").select("controles:data->controles").eq("user_id", u).maybeSingle(),
        ultima("peso"),
        ultima("presion")
      ]);
      for (const r of [regRes, pesoRes, paRes]) if (r.error) throw r.error;

      const hoy = Core.todayStr();
      const controles = (regRes.data?.controles || [])
        .filter(c => c.fecha && c.fecha >= hoy.slice(0, c.fecha.length))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const p = pesoRes.data?.[0], pa = paRes.data?.[0];
      return {
        proximo: controles[0] ? { fecha: controles[0].fecha, texto: controles[0].texto, aprox: !!controles[0].aprox } : null,
        peso: p ? { valor: Number(p.valor), fecha: p.fecha } : null,
        pa: pa ? { s: pa.sistolica, d: pa.diastolica, fecha: pa.fecha } : null
      };
    },
    render(el, d, t) {
      const prox = d.proximo
        ? (() => {
            const n = dias(d.proximo.fecha);
            const cuando = n === 0 ? "hoy" : n === 1 ? "mañana" : n > 0 ? `en ${n} días` : "";
            return `<div class="list"><div class="list-item${n >= 0 && n <= 7 ? " soon" : ""}">
              <span class="grow">${Core.esc(d.proximo.texto)}</span>
              <span class="num">${d.proximo.aprox ? "~" : ""}${fmt(d.proximo.fecha)}</span></div></div>
              ${cuando ? `<div class="small muted">Próximo control ${cuando}</div>` : ""}`;
          })()
        : `<div class="w-msg">Sin controles agendados.</div>`;
      el.innerHTML = `
        ${prox}
        <div class="row-split">
          <div><small>Último peso</small><b>${d.peso ? `${d.peso.valor.toLocaleString("es-CL")} kg` : "—"}</b>
            <small>${d.peso ? fmt(d.peso.fecha) : ""}</small></div>
          <div><small>Última presión</small><b>${d.pa ? `${d.pa.s}/${d.pa.d}` : "—"}</b>
            <small>${d.pa ? fmt(d.pa.fecha) : ""}</small></div>
        </div>
        <div class="card-foot"><span class="muted small">${Core.timeAgo(t)}</span>
          <a href="${window.MIDIA_CONFIG.LINKS.salud}" target="_blank" rel="noopener">Abrir Mi Salud →</a></div>`;
    }
  });
})();

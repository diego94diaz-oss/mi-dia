// ============================================================
//  WIDGET: Inversiones — snapshot data.json del bucket privado
//  `dashboard-data` (mismo Supabase; lo publica el PC / GitHub
//  Action del portafolio). Mismo patrón de acceso que usa
//  finanzas-personales en producción.
//  El snapshot pesa ~3,5 MB → maxAge 30 min (el ⟳ fuerza) y en
//  caché solo se guarda el extracto pequeño.
// ============================================================
(() => {
  const { clp, pct } = Core;

  Core.register({
    id: "inversiones",
    needsAuth: true,
    maxAge: 30 * 60000,
    timeout: 25000,
    async load() {
      const C = window.MIDIA_CONFIG;
      const sess = (await Core.sb().auth.getSession()).data.session;
      if (!sess) throw new Error("sin sesión");
      const url = C.SUPABASE_URL + "/storage/v1/object/dashboard-data/data.json?v=" + Date.now();
      const r = await fetch(url, { cache: "no-store", headers: {
        apikey: C.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + sess.access_token } });
      if (!r.ok) throw new Error("snapshot " + r.status);
      const snap = await r.json();

      const sum = snap.endpoints?.["/api/summary|currency=CLP"];
      const pos = snap.endpoints?.["/api/positions|consolidated=1"] || [];
      if (!sum) throw new Error("snapshot sin summary");

      // Variación % del día del portafolio completo (a partir de las posiciones)
      const rows = (pos.rows || pos);   // tolera ambas formas
      const list = Array.isArray(rows) ? rows : [];
      const val = list.reduce((s, p) => s + (p.value || 0), 0);
      const dchg = list.reduce((s, p) => s + (p.day_change || 0), 0);
      const dayPct = val - dchg > 0 ? dchg / (val - dchg) * 100 : 0;

      // Top movers del día (por |%|, solo posiciones con peso real)
      const movers = list.filter(p => p.value > 50 && p.day_change_pct != null)
        .sort((a, b) => Math.abs(b.day_change_pct) - Math.abs(a.day_change_pct))
        .slice(0, 3)
        .map(p => ({ t: p.ticker, p: p.day_change_pct }));

      return {
        total: sum.total_value,
        totalUSD: sum.total_value_usd,
        dayPct, dayCLP: dchg * (sum.fx_rate || 0),
        mes: sum.twr_month_pct,
        movers,
        generated: snap.generated_at
      };
    },
    render(el, d, t) {
      const gen = d.generated ? new Date(d.generated) : null;
      const fresh = gen ? Core.timeAgo(gen.getTime()) : "";
      el.innerHTML = `
        <div class="metric-big">${clp(d.total)}</div>
        <div class="small muted">portafolio consolidado · US$ ${Math.round(d.totalUSD).toLocaleString("es-CL")}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="chip ${d.dayPct >= 0 ? "pos" : "neg"}">${d.dayPct >= 0 ? "▲" : "▼"} ${pct(d.dayPct)} hoy</span>
          <span class="chip ${d.mes >= 0 ? "pos" : "neg"}">${pct(d.mes)} mes</span>
        </div>
        ${d.movers.length ? `<div class="list">` + d.movers.map(m => `
          <div class="list-item"><span class="grow">${Core.esc(m.t)}</span>
          <span class="num ${m.p >= 0 ? "pos" : "neg"}">${pct(m.p)}</span></div>`).join("") + `</div>` : ""}
        <div class="card-foot"><span class="muted small">datos ${fresh}</span>
          <a href="${window.MIDIA_CONFIG.LINKS.inversiones}" target="_blank" rel="noopener">Abrir Portafolio →</a></div>`;
    }
  });
})();

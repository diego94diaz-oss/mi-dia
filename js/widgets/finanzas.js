// ============================================================
//  WIDGET: Finanzas — saldo líquido, variación de hoy y gasto
//  del mes vs. presupuesto. Lee las tablas fin_* de Supabase
//  (mismas del repo finanzas-personales) y porta sus fórmulas
//  exactas: accountBalance / totalBalance / sumByType.
// ============================================================
(() => {
  const { clp, monthKey, todayStr, fetchAll } = Core;

  // Saldo de una cuenta = inicial + ingresos − gastos ± transferencias (port fiel)
  function accountBalance(acc, txs) {
    let bal = acc.initial || 0;
    for (const t of txs) {
      if (t.type === "ingreso" && t.account === acc.id) bal += t.amount;
      else if (t.type === "gasto" && t.account === acc.id) bal -= t.amount;
      else if (t.type === "transferencia") {
        if (t.account === acc.id) bal -= t.amount;
        if (t.to === acc.id) bal += t.amount;
      }
    }
    return bal;
  }

  Core.register({
    id: "finanzas",
    needsAuth: true,
    async load() {
      const sb = Core.sb(), u = Core.uid();
      const [accRows, txRows, prefRes] = await Promise.all([
        fetchAll("fin_accounts", "data", { user_id: u }),
        fetchAll("fin_transactions", "data", { user_id: u }),
        sb.from("fin_prefs").select("data").eq("user_id", u).maybeSingle()
      ]);
      if (prefRes.error) throw prefRes.error;
      const accounts = accRows.map(r => r.data);
      const txs = txRows.map(r => r.data);
      const prefs = prefRes.data?.data || {};

      // Saldo total líquido: excluye tarjetas y la cuenta puente (mismo criterio de la app)
      const liquid = accounts.filter(a => !a.card && a.name !== "Movimientos internos")
                             .reduce((s, a) => s + accountBalance(a, txs), 0);

      const hoy = todayStr(), mk = monthKey(hoy);
      const sum = (type, filt) => txs.filter(t => t.type === type && filt(t)).reduce((s, t) => s + t.amount, 0);
      const varHoy = sum("ingreso", t => t.date === hoy) - sum("gasto", t => t.date === hoy);
      const gastoMes = sum("gasto", t => monthKey(t.date) === mk);
      const ingresoMes = sum("ingreso", t => monthKey(t.date) === mk);
      const presupuesto = Object.values(prefs.budgets || {}).reduce((s, v) => s + (Number(v) || 0), 0);

      return { liquid, varHoy, gastoMes, ingresoMes, presupuesto };
    },
    render(el, d, t) {
      const pctPres = d.presupuesto > 0 ? Math.round(d.gastoMes / d.presupuesto * 100) : null;
      const meter = pctPres !== null ? `
        <div class="meter${pctPres >= 100 ? " over" : pctPres >= 80 ? " warn" : ""}">
          <div style="width:${Math.min(100, pctPres)}%"></div></div>
        <div class="small muted">${clp(d.gastoMes)} de ${clp(d.presupuesto)} presupuestados (${pctPres}%)</div>`
        : `<div class="small muted">Gasto del mes: ${clp(d.gastoMes)} · sin presupuesto definido</div>`;
      el.innerHTML = `
        <div class="metric-big">${clp(d.liquid)}</div>
        <div class="small muted">disponible hoy</div>
        <div class="chip ${d.varHoy >= 0 ? "pos" : "neg"}">${d.varHoy >= 0 ? "▲" : "▼"} ${clp(Math.abs(d.varHoy))} hoy</div>
        <div class="row-split">
          <div><small>Ingresos mes</small><b class="pos">${clp(d.ingresoMes)}</b></div>
          <div><small>Gastos mes</small><b class="neg">${clp(d.gastoMes)}</b></div>
        </div>
        ${meter}
        <div class="card-foot"><span class="muted small">${Core.timeAgo(t)}</span>
          <a href="${window.MIDIA_CONFIG.LINKS.finanzas}" target="_blank" rel="noopener">Abrir Finanzas →</a></div>`;
    }
  });
})();

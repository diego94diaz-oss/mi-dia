// ============================================================
//  CORE — Mi Día: cliente Supabase, auth, caché y registro de
//  widgets. Cada widget es independiente: su error nunca tumba
//  al resto (carga con timeout + caché stale-while-revalidate).
// ============================================================
const Core = (() => {
  const C = window.MIDIA_CONFIG;
  let sb = null, user = null;

  // ---- Supabase / Auth ----
  function initSB() {
    if (!window.supabase || !C.SUPABASE_URL) return null;
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    return sb;
  }
  async function session() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    user = data?.session?.user || null;
    return data?.session || null;
  }
  async function signIn(email, pass) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    user = data.user;
    return user;
  }
  async function signOut() { if (sb) await sb.auth.signOut(); user = null; location.reload(); }
  const uid = () => user?.id || null;

  // Lee una tabla completa paginando (PostgREST corta en 1000 filas por request).
  async function fetchAll(table, select, filters) {
    const PAGE = 1000;
    let rows = [], from = 0;
    for (;;) {
      let q = sb.from(table).select(select).range(from, from + PAGE - 1);
      for (const [col, val] of Object.entries(filters || {})) q = q.eq(col, val);
      const { data, error } = await q;
      if (error) throw error;
      rows = rows.concat(data || []);
      if (!data || data.length < PAGE) return rows;
      from += PAGE;
    }
  }

  // ---- Caché por widget (stale-while-revalidate) ----
  const cacheGet = id => {
    try { const raw = localStorage.getItem("midia_w_" + id); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  };
  const cacheSet = (id, data) => {
    try { localStorage.setItem("midia_w_" + id, JSON.stringify({ t: Date.now(), data })); }
    catch (e) {}
  };

  const withTimeout = (p, ms) => Promise.race([
    p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
  ]);

  // ---- Registro y ciclo de vida de widgets ----
  const widgets = [];
  function register(w) { widgets.push(w); }

  async function runWidget(w, force) {
    const card = document.getElementById("w-" + w.id);
    if (!card) return;
    const body = card.querySelector(".card-body");
    if (w.needsAuth && !user) {
      body.innerHTML = `<div class="w-msg">Inicia sesión para ver estos datos.</div>`;
      return;
    }
    const cached = cacheGet(w.id);
    // maxAge: fuentes pesadas (snapshot de inversiones) no se re-descargan en
    // cada auto-refresh; el botón ⟳ fuerza igual.
    if (cached && !force && w.maxAge && Date.now() - cached.t < w.maxAge) {
      try { w.render(body, cached.data, cached.t); } catch (e) {}
      return;
    }
    if (cached) {
      try { w.render(body, cached.data, cached.t); } catch (e) { console.warn("render caché", w.id, e); }
    } else {
      body.innerHTML = `<div class="w-msg loading">Cargando…</div>`;
    }
    card.classList.add("refreshing");
    try {
      const data = await withTimeout(w.load(), w.timeout || 12000);
      cacheSet(w.id, data);
      w.render(body, data, Date.now());
      card.classList.remove("stale");
    } catch (e) {
      console.warn("widget", w.id, e);
      if (cached) card.classList.add("stale");   // se muestra el dato viejo + indicador
      else body.innerHTML =
        `<div class="w-msg err">No se pudo cargar. <button class="btn-sm" onclick="Core.refreshOne('${w.id}')">Reintentar</button></div>`;
    } finally {
      card.classList.remove("refreshing");
    }
  }

  function refreshOne(id) { const w = widgets.find(x => x.id === id); if (w) runWidget(w, true); }
  function refreshAll(force) { widgets.forEach(w => runWidget(w, force === true)); }

  // ---- Utilidades compartidas ----
  const clp = n => { n = Math.round(n || 0); return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-CL"); };
  const pct = n => (n >= 0 ? "+" : "") + (n || 0).toFixed(2) + "%";
  const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const monthKey = s => (s || "").slice(0, 7);
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function timeAgo(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "recién";
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 48) return `hace ${h} h`;
    return `hace ${Math.round(h / 24)} días`;
  }

  return { initSB, session, signIn, signOut, uid, fetchAll,
           register, runWidget, refreshOne, refreshAll,
           sb: () => sb, user: () => user,
           clp, pct, todayStr, monthKey, esc, timeAgo, cacheGet };
})();

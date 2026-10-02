// ============================================================
//  APP — arranque, login y ciclo de refresco de Mi Día
// ============================================================
(() => {
  const C = window.MIDIA_CONFIG;
  const $ = s => document.querySelector(s);

  function authMsg(t, ok) {
    const m = $("#auth-msg");
    if (m) { m.textContent = t || ""; m.style.color = ok ? "var(--green)" : "var(--red)"; }
  }

  async function doLogin() {
    const email = $("#auth-email").value.trim(), pass = $("#auth-pass").value;
    if (!email || !pass) { authMsg("Completa email y contraseña."); return; }
    authMsg("Entrando…", true);
    try {
      await Core.signIn(email, pass);
      $("#auth-overlay").style.display = "none";
      $("#btn-logout").style.display = "";
      Core.refreshAll();
    } catch (e) { authMsg(e.message || "No se pudo entrar."); }
  }

  // Barra "Mis apps": accesos a todo el ecosistema (definidos en config.APPS)
  function renderApps() {
    const nav = $("#apps");
    if (!nav || !C.APPS) return;
    nav.innerHTML = C.APPS.map(a => `
      <a class="app-tile app-${a.id}${a.soloPC ? " pc" : ""}" href="${a.url}" target="_blank" rel="noopener"
         ${a.nota ? `title="${Core.esc(a.nota)}"` : ""}>
        <span class="ico" aria-hidden="true"><img src="icons/${a.id}.png" alt="" width="48" height="48"></span>
        <span>${Core.esc(a.nombre.replace(" (PC)", ""))}${a.soloPC ? "<small>en este PC</small>" : ""}</span>
      </a>`).join("");
  }

  async function boot() {
    renderApps();
    if (!Core.initSB()) { authMsg("No se pudo cargar Supabase."); return; }
    const sess = await Core.session();
    if (sess) {
      $("#auth-overlay").style.display = "none";
      $("#btn-logout").style.display = "";
    } else {
      $("#auth-overlay").style.display = "flex";
    }
    Core.refreshAll();   // los widgets sin auth cargan igual (hero/clima)

    // Auto-refresh periódico + al volver a la pestaña
    setInterval(Core.refreshAll, (C.REFRESH_MIN || 5) * 60000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) Core.refreshAll();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#auth-btn").addEventListener("click", doLogin);
    $("#auth-pass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
    $("#btn-refresh").addEventListener("click", () => {
      $("#btn-refresh").classList.add("spin");
      Core.refreshAll(true);
      setTimeout(() => $("#btn-refresh").classList.remove("spin"), 900);
    });
    $("#btn-logout").addEventListener("click", Core.signOut);
    boot();

    // Pull-to-refresh (móvil): arrastrar hacia abajo con la página arriba del todo
    let ptrY = null;
    document.addEventListener("touchstart", e => {
      ptrY = (window.scrollY <= 0) ? e.touches[0].clientY : null;
    }, { passive: true });
    document.addEventListener("touchmove", e => {
      if (ptrY !== null && e.touches[0].clientY - ptrY > 90) {
        ptrY = null;
        $("#btn-refresh").classList.add("spin");
        Core.refreshAll(true);
        setTimeout(() => $("#btn-refresh").classList.remove("spin"), 900);
      }
    }, { passive: true });

    // Service worker (PWA) — solo sobre http(s)
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  });
})();

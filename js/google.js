// ============================================================
//  GOOGLE — token OAuth compartido (Google Identity Services)
//  para las cards Agenda (Calendar readonly) y Correo (Gmail
//  readonly). Un solo consentimiento cubre ambos scopes.
//  El access token (~1 h) se cachea en localStorage.
// ============================================================
const MiDiaGoogle = (() => {
  const C = window.MIDIA_CONFIG;
  const SCOPES = "https://www.googleapis.com/auth/calendar.readonly " +
                 "https://www.googleapis.com/auth/gmail.readonly";
  const TK = "midia_g_token";
  try { localStorage.removeItem("midia_gcal_token"); } catch (e) {}   // clave vieja (solo calendar)

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
  function clearToken() { try { localStorage.removeItem(TK); } catch (e) {} }

  // interactive=true solo desde el botón "Conectar" (gesto del usuario)
  async function getToken(interactive) {
    if (!C.GOOGLE_CLIENT_ID) throw new Error("sin GOOGLE_CLIENT_ID");
    const saved = savedToken();
    if (saved) return saved;
    await loadGIS();
    return new Promise((res, rej) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: C.GOOGLE_CLIENT_ID,
        scope: SCOPES,
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

  // fetch autenticado: en 401/403 borra el token (scopes viejos / expirado)
  // para que las cards vuelvan al estado "Conectar Google".
  async function gfetch(url, interactive) {
    const token = await getToken(interactive);
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (r.status === 401 || r.status === 403) { clearToken(); throw new Error("auth " + r.status); }
    if (!r.ok) throw new Error("google " + r.status);
    return r.json();
  }

  async function connectAnd(widgetIds) {
    try { await getToken(true); (widgetIds || []).forEach(id => Core.refreshOne(id)); }
    catch (e) { console.warn("google connect", e); }
  }

  return { getToken, gfetch, clearToken, connectAnd, configured: () => !!C.GOOGLE_CLIENT_ID };
})();

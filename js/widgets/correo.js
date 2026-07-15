// ============================================================
//  WIDGET: Correo — los correos más urgentes de responder o
//  accionar. Gmail API readonly directo desde el navegador
//  (token compartido MiDiaGoogle). Solo bandeja Principal,
//  últimos 7 días; urgencia por heurística:
//    ⭐ STARRED +3 · IMPORTANT +2 · UNREAD +2
// ============================================================
(() => {
  const GM = "https://gmail.googleapis.com/gmail/v1/users/me";

  function fromName(h) {
    // "Nombre Apellido <mail@x.com>" → "Nombre Apellido"
    const m = h.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
    return (m ? m[1] : h.replace(/[<>]/g, "")).trim();
  }
  function edad(ms) {
    const h = Math.round((Date.now() - ms) / 3600000);
    if (h < 1) return "hace <1 h";
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return `hace ${d} d`;
  }

  Core.register({
    id: "correo",
    needsAuth: false,   // auth propia (Google), no Supabase
    timeout: 20000,
    async load() {
      if (!MiDiaGoogle.configured()) return { setup: true };
      let list;
      try {
        list = await MiDiaGoogle.gfetch(
          GM + "/messages?q=" + encodeURIComponent("in:inbox category:primary newer_than:7d") +
          "&maxResults=25", false);
      } catch (e) { return { connect: true }; }

      const ids = (list.messages || []).slice(0, 15).map(m => m.id);
      const metas = await Promise.all(ids.map(id =>
        MiDiaGoogle.gfetch(GM + `/messages/${id}?format=metadata` +
          "&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date", false)
          .catch(() => null)));

      const mails = metas.filter(Boolean).map(m => {
        const H = Object.fromEntries((m.payload?.headers || []).map(h => [h.name, h.value]));
        const labels = m.labelIds || [];
        let score = 0;
        if (labels.includes("STARRED")) score += 3;
        if (labels.includes("IMPORTANT")) score += 2;
        if (labels.includes("UNREAD")) score += 2;
        return {
          id: m.id,
          de: fromName(H.From || "?"),
          asunto: H.Subject || "(sin asunto)",
          ts: Number(m.internalDate) || Date.parse(H.Date) || Date.now(),
          unread: labels.includes("UNREAD"),
          starred: labels.includes("STARRED"),
          important: labels.includes("IMPORTANT"),
          score
        };
      });

      const noLeidos = mails.filter(m => m.unread).length;
      const urgentes = mails.filter(m => m.score >= 2)
        .sort((a, b) => b.score - a.score || b.ts - a.ts)
        .slice(0, 5);
      return { noLeidos, total: mails.length, urgentes };
    },
    render(el, d, t) {
      if (d.setup) {
        el.innerHTML = `<div class="w-msg">Falta configurar el <b>Client ID de Google</b> en
          <code>js/config.js</code> para ver tu correo.</div>`;
        return;
      }
      if (d.connect) {
        el.innerHTML = `<div class="w-msg">Conecta tu Gmail (solo lectura).</div>
          <button class="btn-sm" onclick="MiDiaAgenda.connect()">Conectar Google</button>`;
        return;
      }
      const head = d.noLeidos > 0
        ? `<div class="chip ${d.noLeidos > 5 ? "neg" : "pos"}">📬 ${d.noLeidos} sin leer en Principal (7 días)</div>`
        : `<div class="chip pos">📭 Bandeja principal al día</div>`;
      const lista = d.urgentes.length ? `<div class="list">` + d.urgentes.map(m => `
        <a class="list-item mail${m.unread ? " unread" : ""}" target="_blank" rel="noopener"
           href="https://mail.google.com/mail/u/0/#inbox/${m.id}">
          <span class="mail-flags">${m.starred ? "⭐" : m.important ? "❗" : m.unread ? "●" : ""}</span>
          <span class="grow"><b>${Core.esc(m.de)}</b><br>
            <span class="small ${m.unread ? "" : "muted"}">${Core.esc(m.asunto)}</span></span>
          <span class="small muted" style="white-space:nowrap">${edad(m.ts)}</span>
        </a>`).join("") + `</div>`
        : `<div class="w-msg">Nada urgente que responder. ✨</div>`;
      el.innerHTML = `
        ${head}
        ${lista}
        <div class="card-foot"><span class="muted small">${Core.timeAgo(t)}</span>
          <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener">Abrir Gmail →</a></div>`;
    }
  });
})();

// ============================================================
//  WIDGET: Viajes — próximo viaje de Travel Manager.
//  Lee del Supabase compartido (solo lectura, tablas de Travel Manager):
//   - tm_trips: el viaje en curso o el siguiente (no cancelado).
//   - tm_flights: próximo vuelo de ese viaje. Las fechas son hora local
//     del aeropuerto ("YYYY-MM-DDTHH:mm"), se comparan como texto.
//  No lee códigos de reserva.
// ============================================================
(() => {
  const dias = (desde, hasta) => Math.round((new Date(hasta + "T12:00") - new Date(desde + "T12:00")) / 86400000);
  const fmt = s => s.slice(8, 10) + "-" + s.slice(5, 7);

  Core.register({
    id: "viajes",
    needsAuth: true,
    async load() {
      const sb = Core.sb(), hoy = Core.todayStr();
      const { data: viajes, error } = await sb.from("tm_trips")
        .select("id,name,start_date,end_date")
        .neq("status", "cancelado").gte("end_date", hoy)
        .order("start_date").limit(1);
      if (error) throw error;
      const viaje = (viajes || [])[0];
      if (!viaje) return { viaje: null };
      const { data: vuelos, error: e2 } = await sb.from("tm_flights")
        .select("airline,flight_number,origin_code,destination_code,departure_local")
        .eq("trip_id", viaje.id).neq("booking_status", "cancelado")
        .gte("departure_local", hoy).order("departure_local").limit(1);
      if (e2) throw e2;
      return { viaje, vuelo: (vuelos || [])[0] || null };
    },
    render(el, d, t) {
      const app = window.MIDIA_CONFIG.LINKS.viajes;
      const pie = href => `<div class="card-foot"><span class="muted small">${Core.timeAgo(t)}</span>
        <a href="${href}" target="_blank" rel="noopener">Abrir Viajes →</a></div>`;
      if (!d.viaje) {
        el.innerHTML = `<div class="w-msg">Sin viajes próximos.</div>${pie(app)}`;
        return;
      }
      const { viaje, vuelo } = d, hoy = Core.todayStr();
      const faltan = dias(hoy, viaje.start_date);
      const estado = faltan > 0 ? `${faltan} ${faltan === 1 ? "día" : "días"} para salir`
        : faltan === 0 ? "¡Hoy empieza!"
        : `Día ${1 - faltan} de ${dias(viaje.start_date, viaje.end_date) + 1}`;
      const proximo = vuelo ? `<div class="row-split">
          <div><small>Próximo vuelo</small><b>${Core.esc(vuelo.origin_code || "?")} → ${Core.esc(vuelo.destination_code || "?")}</b></div>
          <div><small>${Core.esc([vuelo.airline, vuelo.flight_number].filter(Boolean).join(" ") || "Salida")}</small><b>${fmt(vuelo.departure_local)} ${Core.esc(vuelo.departure_local.slice(11, 16))}</b></div>
        </div>` : "";
      el.innerHTML = `
        <div class="metric-big" style="font-size:22px">${estado}</div>
        <div class="small muted">${Core.esc(viaje.name)} · ${fmt(viaje.start_date)} al ${fmt(viaje.end_date)}</div>
        ${proximo}
        ${pie(`${app}#/trips/${encodeURIComponent(viaje.id)}`)}`;
    }
  });
})();

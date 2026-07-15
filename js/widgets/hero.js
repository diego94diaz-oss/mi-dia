// ============================================================
//  WIDGET: Hero — saludo, fecha/hora y clima (Open-Meteo)
//  No requiere login. El reloj corre aparte del ciclo de datos.
// ============================================================
(() => {
  const C = window.MIDIA_CONFIG;

  const WMO = {   // código WMO → [texto, emoji]
    0: ["Despejado", "☀️"], 1: ["Mayormente despejado", "🌤️"], 2: ["Parcial nublado", "⛅"],
    3: ["Nublado", "☁️"], 45: ["Neblina", "🌫️"], 48: ["Neblina", "🌫️"],
    51: ["Llovizna", "🌦️"], 53: ["Llovizna", "🌦️"], 55: ["Llovizna", "🌧️"],
    61: ["Lluvia débil", "🌧️"], 63: ["Lluvia", "🌧️"], 65: ["Lluvia fuerte", "🌧️"],
    66: ["Lluvia helada", "🌧️"], 67: ["Lluvia helada", "🌧️"],
    71: ["Nieve", "🌨️"], 73: ["Nieve", "🌨️"], 75: ["Nieve fuerte", "❄️"], 77: ["Nieve", "🌨️"],
    80: ["Chubascos", "🌦️"], 81: ["Chubascos", "🌧️"], 82: ["Chubascos fuertes", "⛈️"],
    85: ["Chubascos de nieve", "🌨️"], 86: ["Chubascos de nieve", "❄️"],
    95: ["Tormenta", "⛈️"], 96: ["Tormenta con granizo", "⛈️"], 99: ["Tormenta con granizo", "⛈️"]
  };
  const wmo = c => WMO[c] || ["—", "🌡️"];

  function saludo() {
    const h = new Date().getHours();
    if (h < 6) return "Buenas noches";
    if (h < 12) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  }
  function fechaLarga() {
    return new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function tickClock() {
    const el = document.getElementById("hero-clock");
    if (el) el.textContent = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    const sal = document.getElementById("hero-saludo");
    if (sal) sal.textContent = `${saludo()}, Diego`;
    const f = document.getElementById("hero-fecha");
    if (f) f.textContent = cap(fechaLarga());
  }
  setInterval(tickClock, 30000);

  Core.register({
    id: "hero",
    needsAuth: false,
    async load() {
      const w = C.WEATHER;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${w.lat}&longitude=${w.lon}` +
        `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code` +
        `&timezone=${encodeURIComponent(w.tz)}&forecast_days=1`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("open-meteo " + r.status);
      const d = await r.json();
      return {
        temp: Math.round(d.current?.temperature_2m),
        code: d.current?.weather_code,
        max: Math.round(d.daily?.temperature_2m_max?.[0]),
        min: Math.round(d.daily?.temperature_2m_min?.[0])
      };
    },
    render(el, d) {
      const [txt, emo] = wmo(d.code);
      el.innerHTML = `
        <span class="hero-emoji">${emo}</span>
        <span class="hero-temp">${d.temp}°</span>
        <span class="hero-wtxt">${txt} · ${C.WEATHER.lugar}<br>
        <span class="muted">máx ${d.max}° / mín ${d.min}°</span></span>`;
      tickClock();
    }
  });

  tickClock();
})();

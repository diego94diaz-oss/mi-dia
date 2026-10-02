// ============================================================
//  CONFIG — Mi Día
//  Supabase: proyecto COMPARTIDO con finanzas-personales y
//  kratos-gym (anon/publishable key: pública por diseño; los
//  datos están protegidos por Row Level Security + login).
// ============================================================
window.MIDIA_CONFIG = {
  SUPABASE_URL: "https://ivzzgeoeygggaoazcoeq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_G2liTTYj_Ik4LCmh0b2rNw_mPukyFlD",

  // Google Calendar (OAuth Client ID de Google Cloud, proyecto "mi-dia")
  GOOGLE_CLIENT_ID: "880021741105-vrj1dmbm0mr4u4fu8hoi0h5hcu2fqutm.apps.googleusercontent.com",

  // Clima — Open-Meteo (sin API key). Lebu, Región del Biobío, Chile.
  WEATHER: { lat: -37.6083, lon: -73.6533, tz: "America/Santiago", lugar: "Lebu" },

  // Enlaces a las apps completas (los widgets los usan en su "Abrir … →")
  LINKS: {
    finanzas:    "https://diego94diaz-oss.github.io/finanzas-personales/",
    inversiones: "https://mis-inversiones.github.io/",
    kratos:      "https://diego94diaz-oss.github.io/kratos-gym/",
    salud:       "https://mi-salud.diego94diaz.workers.dev/"
  },

  // Barra "Mis apps": acceso directo a todo el ecosistema.
  // (soloPC: true oculta un acceso en el celular; hoy ninguno lo usa.)
  APPS: [
    { id: "finanzas",    nombre: "Finanzas",    icono: "💰", url: "https://diego94diaz-oss.github.io/finanzas-personales/" },
    { id: "inversiones", nombre: "Inversiones", icono: "📈", url: "https://mis-inversiones.github.io/" },
    { id: "kratos",      nombre: "Entrenamiento",      icono: "⚔️", url: "https://diego94diaz-oss.github.io/kratos-gym/" },
    { id: "salud",       nombre: "Salud",       icono: "🩺", url: "https://mi-salud.diego94diaz.workers.dev/" }
  ],

  REFRESH_MIN: 5   // auto-refresh de datos (minutos)
};

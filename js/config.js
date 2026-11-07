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
    finanzas:    "https://finanzas.diego94diaz.workers.dev/",
    inversiones: "https://mis-inversiones.github.io/",
    kratos:      "https://entrenamiento.diego94diaz.workers.dev/",
    salud:       "https://mi-salud.diego94diaz.workers.dev/",
    viajes:      "https://viajes.diego94diaz.workers.dev/"
  },

  // Barra "Mis apps": acceso directo a todo el ecosistema.
  // (soloPC: true oculta un acceso en el celular; hoy ninguno lo usa. Con sesión, los accesos abren
  //  cada app ya con sesión vía portafolio-sso, salvo los marcados sso: false.)
  APPS: [
    { id: "finanzas",    nombre: "Finanzas",    icono: "💰", url: "https://finanzas.diego94diaz.workers.dev/" },
    { id: "inversiones", nombre: "Inversiones", icono: "📈", url: "https://mis-inversiones.github.io/" },
    { id: "kratos",      nombre: "Entrenamiento",      icono: "⚔️", url: "https://entrenamiento.diego94diaz.workers.dev/" },
    { id: "salud",       nombre: "Salud",       icono: "🩺", url: "https://mi-salud.diego94diaz.workers.dev/" },
    { id: "viajes",      nombre: "Viajes",      icono: "✈️", url: "https://viajes.diego94diaz.workers.dev/" },
    // Sin login propio (sso: false): se abre directo, sin pedir código de sesión.
    { id: "calculadora", nombre: "Calculadora", icono: "🧮", url: "https://calculadora.diego94diaz.workers.dev/", sso: false }
  ],

  REFRESH_MIN: 5   // auto-refresh de datos (minutos)
};

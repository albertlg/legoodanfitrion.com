const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-script";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let mapsLoadPromise;

function loadGoogleMapsPlaces() {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps API key not configured."));
  }

  // Si ya se ha cargado previamente en la sesión, lo devolvemos al instante
  if (typeof window !== "undefined" && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  // Si ya hay una promesa en curso (evita cargar el script 2 veces si 2 componentes lo piden a la vez)
  if (mapsLoadPromise) {
    return mapsLoadPromise;
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    // Definimos la función global que Google Maps ejecutará automáticamente al terminar
    window.__googleMapsInitCallback = () => {
      resolve(window.google);
      delete window.__googleMapsInitCallback; // Limpiamos el objeto global para ser limpios
    };

    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existing) {
      // Si el script ya estaba en el DOM pero la promesa no, esperamos un poco
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;

    // 🚀 FIX AVISO CONSOLA: Añadimos &loading=async y &callback=__googleMapsInitCallback
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker&loading=async&callback=__googleMapsInitCallback`;

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps script."));
      delete window.__googleMapsInitCallback;
    };

    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

function isGoogleMapsConfigured() {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export { loadGoogleMapsPlaces, isGoogleMapsConfigured };
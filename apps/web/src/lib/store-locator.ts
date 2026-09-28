export type StoreLocation = {
  id: string;
  name: string;
  description: string;
  city: string;
  department: string;
  latitude: number;
  longitude: number;
  brands: string[];
};

export const demoStores: StoreLocation[] = [
  { id: "agro-del-este-demo", name: "Agro del Este Demo", description: "Ubicación de demostración en Maldonado", city: "Maldonado", department: "Maldonado", latitude: -34.9014, longitude: -54.95, brands: ["Biofresh", "Guabi Natural", "Gran Plus"] },
  { id: "mascotas-del-puerto-demo", name: "Mascotas del Puerto Demo", description: "Ubicación de demostración en Colonia", city: "Colonia del Sacramento", department: "Colonia", latitude: -34.471, longitude: -57.8442, brands: ["Three Cats", "Three Dogs", "Pipicat"] },
  { id: "pet-center-costa-demo", name: "Pet Center Costa Demo", description: "Ubicación de demostración en Ciudad de la Costa", city: "Ciudad de la Costa", department: "Canelones", latitude: -34.8314, longitude: -55.9641, brands: ["Beny", "Primocão", "Procão"] },
  { id: "pet-shop-rambla-demo", name: "Pet Shop Rambla Demo", description: "Ubicación de demostración en Pocitos", city: "Montevideo", department: "Montevideo", latitude: -34.9097, longitude: -56.1508, brands: ["Pipicat", "TOH", "YowUp"] },
  { id: "veterinaria-huella-demo", name: "Veterinaria Huella Demo", description: "Ubicación de demostración en Cordón", city: "Montevideo", department: "Montevideo", latitude: -34.9021, longitude: -56.1782, brands: ["Biofresh", "Gran Plus", "Three Dogs"] },
  { id: "veterinaria-norte-demo", name: "Veterinaria Norte Demo", description: "Ubicación de demostración en Salto", city: "Salto", department: "Salto", latitude: -31.388, longitude: -57.9601, brands: ["Beny", "Primogato", "4 Pets"] },
];

export const directionsUrl = (store: StoreLocation) =>
  `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;

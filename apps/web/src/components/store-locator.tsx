"use client";

import { ExternalLink, LocateFixed, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { demoStores, directionsUrl, type StoreLocation } from "@/lib/store-locator";

type UserLocation = { latitude: number; longitude: number };
const unique = (values: string[]) => [...new Set(values)].sort();

function distanceKm(a: UserLocation, store: StoreLocation) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitude = radians(store.latitude - a.latitude);
  const longitude = radians(store.longitude - a.longitude);
  const value =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(store.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function StoreLocator() {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const markers = useRef<import("leaflet").LayerGroup | null>(null);
  const userMarker = useRef<import("leaflet").CircleMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<string>();
  const [userLocation, setUserLocation] = useState<UserLocation>();
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  // Solo se pliegan en el sitio público en móvil (.site-locator); en la tienda los botones quedan ocultos.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const brands = unique(demoStores.flatMap((store) => store.brands));
  const departments = unique(demoStores.map((store) => store.department));
  const cities = unique(demoStores.filter((store) => !department || store.department === department).map((store) => store.city));
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const stores = demoStores.filter(
      (store) =>
        (!brand || store.brands.includes(brand)) &&
        (!department || store.department === department) &&
        (!city || store.city === city) &&
        (!term || [store.name, store.description, store.city, store.department, ...store.brands].some((value) => value.toLowerCase().includes(term))),
    );
    return userLocation
      ? [...stores].sort((a, b) => distanceKm(userLocation, a) - distanceKm(userLocation, b))
      : stores;
  }, [brand, city, department, search, userLocation]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const L = await import("leaflet");
      if (!active || !mapElement.current) return;
      leaflet.current = L;
      const instance = L.map(mapElement.current, { center: [-32.8, -56.1], zoom: 6, scrollWheelZoom: false });
      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);
      map.current = instance;
      markers.current = L.layerGroup().addTo(instance);
      setMapReady(true);
    }
    void initialize();
    return () => {
      active = false;
      map.current?.remove();
      map.current = null;
      markers.current = null;
      leaflet.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    const layer = markers.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();
    for (const store of filtered) {
      const icon = L.divIcon({
        className: "contact-map-marker-shell",
        html: '<span class="contact-map-marker" aria-hidden="true"></span>',
        iconSize: [26, 34],
        iconAnchor: [13, 34],
      });
      L.marker([store.latitude, store.longitude], { icon, title: store.name })
        .bindPopup(`<strong>${store.name}</strong><br>${store.city}`)
        .on("click", () => setSelected(store.id))
        .addTo(layer);
    }
  }, [filtered, mapReady]);

  function showOnMap(store: StoreLocation) {
    setSelected(store.id);
    map.current?.flyTo([store.latitude, store.longitude], 14, { duration: 0.7 });
  }

  function locate() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = { latitude: coords.latitude, longitude: coords.longitude };
        setUserLocation(current);
        setLocating(false);
        setLocationMessage("Ordenamos los resultados por cercanía. Tu ubicación no se guarda.");
        const L = leaflet.current;
        if (L && map.current) {
          userMarker.current?.remove();
          userMarker.current = L.circleMarker([current.latitude, current.longitude], {
            radius: 8,
            color: "#ffffff",
            weight: 3,
            fillColor: "#1e5967",
            fillOpacity: 1,
          }).bindPopup("Tu ubicación aproximada").addTo(map.current);
          map.current.setView([current.latitude, current.longitude], 10);
        }
      },
      () => {
        setLocating(false);
        setLocationMessage("No pudimos acceder a tu ubicación. Podés seguir usando los filtros.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  function clearFilters() {
    setSearch("");
    setBrand("");
    setDepartment("");
    setCity("");
    setSelected(undefined);
  }

  return (
    <div className="contact-locator">
      <div className="contact-demo-note" role="note"><strong>Vista de demostración.</strong> Estos comercios y ubicaciones son ficticios; se reemplazarán por el padrón confirmado de DISTRICO.</div>
      <div className="contact-filters" aria-label="Filtrar puntos de venta">
        <label className="field contact-search-field">Buscar<span className="contact-search-control"><Search size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Comercio, localidad o marca" /></span></label>
        <button className="contact-filters-toggle" type="button" aria-expanded={filtersOpen} aria-controls="store-filter-panel" onClick={() => setFiltersOpen((open) => !open)}>Filtros{brand || department || city ? ` (${[brand, department, city].filter(Boolean).length})` : ""}</button>
        <div className={`contact-filter-panel${filtersOpen ? " is-open" : ""}`} id="store-filter-panel">
        <label className="field">Marca<select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">Todas las marcas</option>{brands.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label className="field">Departamento<select value={department} onChange={(event) => { setDepartment(event.target.value); setCity(""); }}><option value="">Todos los departamentos</option>{departments.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        <label className="field">Localidad<select value={city} onChange={(event) => setCity(event.target.value)}><option value="">Todas las localidades</option>{cities.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        </div>
        <div className="contact-filter-actions">
          <button className="button secondary small" type="button" onClick={locate} disabled={locating}><LocateFixed size={17} />{locating ? "Buscando…" : "Usar mi ubicación"}</button>
          <button className="text-button" type="button" onClick={clearFilters}><X size={16} /> Limpiar filtros</button>
        </div>
      </div>
      {locationMessage && <p className="contact-location-message" role="status">{locationMessage}</p>}
      <div className="contact-locator-layout">
        <div className="contact-store-results" aria-live="polite">
          <p className="contact-result-count">{filtered.length} {filtered.length === 1 ? "punto" : "puntos"} de venta<button className="contact-list-toggle" type="button" aria-expanded={listOpen} aria-controls="store-results-list" onClick={() => setListOpen((open) => !open)}><span className="visually-hidden">{listOpen ? "Ocultar listado" : "Mostrar listado"}</span></button></p>
          <div className={`contact-store-list${listOpen ? " is-open" : ""}`} id="store-results-list">
            {filtered.map((store) => (
              <article className={`contact-store-card ${selected === store.id ? "is-selected" : ""}`} key={store.id}>
                <div className="contact-store-title"><h3>{store.name}</h3><span>Demo</span></div>
                <p>{store.description}</p>
                <p className="contact-store-location"><MapPin size={15} /> {store.city}, {store.department}</p>
                {userLocation && <p className="contact-distance">A {distanceKm(userLocation, store).toFixed(1)} km aprox.</p>}
                <ul className="contact-brand-tags" aria-label="Marcas disponibles">{store.brands.map((item) => <li key={item}>{item}</li>)}</ul>
                <div className="contact-store-actions"><button type="button" onClick={() => showOnMap(store)}>Ver en el mapa</button><a href={directionsUrl(store)} target="_blank" rel="noreferrer">Cómo llegar <ExternalLink size={14} /></a></div>
              </article>
            ))}
            {!filtered.length && <p className="contact-no-results">No encontramos puntos con esos filtros.</p>}
          </div>
        </div>
        <div className="contact-map-wrap" aria-label="Mapa de puntos de venta"><div className="contact-map" ref={mapElement} />{!mapReady && <p className="contact-map-loading">Cargando mapa…</p>}</div>
      </div>
    </div>
  );
}

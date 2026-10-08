"use client";

import { useRef, useState } from "react";
import { BriefcaseBusiness, Clock, MapPin, Search } from "lucide-react";
import { jobOpenings, jobOpeningsAreExamples, type JobOpening } from "@/data/job-openings";

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const areas = ["Logística y depósito", "Ventas", "Administración", "Marketing"] as const;
const schedules = ["Jornada completa", "Medio tiempo"] as const;
const publishedLabel = (date: string) =>
  `Publicada el ${new Date(`${date}T12:00:00Z`).toLocaleDateString("es-UY", { day: "numeric", month: "long", timeZone: "UTC" })}`;
const applyHref = (job: JobOpening) =>
  `mailto:contacto@districo.com.uy?subject=${encodeURIComponent(`Postulación: ${job.title} (${job.location})`)}`;
const toggle = <T,>(list: readonly T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export function SiteJobs() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [pickedAreas, setPickedAreas] = useState<readonly string[]>([]);
  const [pickedSchedules, setPickedSchedules] = useState<readonly string[]>([]);
  const [sort, setSort] = useState<"recent" | "az">("recent");
  const [open, setOpen] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  if (jobOpenings.length === 0) {
    return (
      <div className="site-empty jobs-empty">
        <h2>No hay búsquedas abiertas en este momento.</h2>
        <p>Dejanos tu CV y te contactamos cuando se abra una vacante para tu perfil.</p>
      </div>
    );
  }

  const search = fold(query.trim());
  const base = jobOpenings.filter(
    (job) => (!location || job.location === location) && (!search || fold(`${job.title} ${job.area}`).includes(search)),
  );
  const shown = base
    .filter((job) => (!pickedAreas.length || pickedAreas.includes(job.area)) && (!pickedSchedules.length || pickedSchedules.includes(job.schedule)))
    .sort((a, b) => (sort === "az" ? a.title.localeCompare(b.title, "es") : b.published.localeCompare(a.published)));

  return (
    <>
      <form
        className="jobs-finder"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <label className="jobs-field">
          <Search size={20} aria-hidden="true" />
          <span className="visually-hidden">Puesto o palabra clave</span>
          <input type="search" placeholder="Puesto o palabra clave" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="jobs-field">
          <MapPin size={20} aria-hidden="true" />
          <span className="visually-hidden">Sede</span>
          <select value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="">Todas las sedes</option>
            <option value="Montevideo">Montevideo</option>
            <option value="Maldonado">Maldonado</option>
          </select>
        </label>
        <button className="button lime" type="submit">Buscar</button>
      </form>

      <div ref={resultsRef} className="jobs-body">
        <aside className="jobs-filters" aria-label="Filtros">
          <fieldset>
            <legend>Área</legend>
            {areas.map((area) => (
              <label key={area} className="jobs-check">
                <input type="checkbox" checked={pickedAreas.includes(area)} onChange={() => setPickedAreas((list) => toggle(list, area))} />
                {area}
                <small>{base.filter((job) => job.area === area).length}</small>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Jornada</legend>
            {schedules.map((schedule) => (
              <label key={schedule} className="jobs-check">
                <input type="checkbox" checked={pickedSchedules.includes(schedule)} onChange={() => setPickedSchedules((list) => toggle(list, schedule))} />
                {schedule}
                <small>{base.filter((job) => job.schedule === schedule).length}</small>
              </label>
            ))}
          </fieldset>
          <button className="button" type="button" onClick={() => { setQuery(""); setLocation(""); setPickedAreas([]); setPickedSchedules([]); }}>
            Limpiar filtros
          </button>
        </aside>

        <section aria-labelledby="jobs-result">
          {jobOpeningsAreExamples && (
            <p className="jobs-note">Modo demo: puestos de ejemplo. En el sitio real se muestran solo las búsquedas cargadas por DISTRICO.</p>
          )}
          <div className="jobs-result-head">
            <h2 id="jobs-result" aria-live="polite">{shown.length === 1 ? "1 puesto disponible" : `${shown.length} puestos disponibles`}</h2>
            <label>
              Ordenar
              <select value={sort} onChange={(event) => setSort(event.target.value as "recent" | "az")}>
                <option value="recent">Más recientes</option>
                <option value="az">A–Z</option>
              </select>
            </label>
          </div>
          <ul className="jobs-list">
            {shown.map((job) => {
              const expanded = open === job.id;
              return (
                <li key={job.id} className={`jobs-item${expanded ? " is-open" : ""}`}>
                  <div className="jobs-row">
                    <div className="jobs-main">
                      <h3>{job.title}</h3>
                      <ul className="jobs-meta">
                        <li><MapPin size={16} aria-hidden="true" />{job.location}</li>
                        <li><BriefcaseBusiness size={16} aria-hidden="true" />{job.area}</li>
                        <li><Clock size={16} aria-hidden="true" />{job.schedule}</li>
                      </ul>
                    </div>
                    <span className="jobs-date">{publishedLabel(job.published)}</span>
                    <button
                      className="jobs-toggle"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`job-${job.id}`}
                      onClick={() => setOpen(expanded ? null : job.id)}
                    >
                      {expanded ? "Cerrar" : "Ver puesto"}
                    </button>
                  </div>
                  {expanded && (
                    <div id={`job-${job.id}`} className="jobs-more">
                      <p>{job.description}</p>
                      <div>
                        <h4>Qué buscamos</h4>
                        <ul>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <h4>Qué ofrecemos</h4>
                        <ul>
                          <li>Gimnasio sin costo para colaboradores</li>
                          <li>Comedor con menú diario</li>
                          <li>Lavado de uniforme y ropa de deporte</li>
                        </ul>
                      </div>
                      <a className="button lime" href={applyHref(job)}>Postularme</a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && <p className="site-empty">No hay puestos con esos filtros. Probá con otra sede o área.</p>}
        </section>
      </div>
    </>
  );
}

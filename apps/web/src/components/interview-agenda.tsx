"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi, useSession } from "./providers";
import { canEditAdminFeature } from "@/lib/staff-access";
import { candidateStatuses } from "@/data/job-openings";
import { storeRoutes } from "@/lib/store-routes";
import { ListPagination } from "./admin-list-filters";
import { CandidateWorkspace } from "./candidate-workspace";
import { Empty, ErrorBox, Loading, Modal } from "./ui";

type Interview = {
  id: string;
  scheduledAt: string;
  body: string;
  candidate: {
    id: string;
    name: string;
    status: keyof typeof candidateStatuses;
    job: { id: string; title: string };
  };
};
export function InterviewAgenda() {
  const { user } = useSession();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Interview["candidate"] | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (term) params.set("search", term);
  if (from) params.set("dateFrom", from);
  if (to) params.set("dateTo", to);
  const q = useApi<{
    items: Interview[];
    meta: { total: number; page: number; limit: number };
  }>(`admin/operations/recruitment/interviews?${params}`, open);
  return (
    <section className="admin-record-section">
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Agenda de entrevistas</summary>
        {open && (
          <>
            <div className="admin-toolbar">
              <label className="field">
                Buscar candidato o puesto
                <input
                  className="form-input"
                  type="search"
                  maxLength={120}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="field">
                Desde
                <input
                  className="form-input"
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="field">
                Hasta
                <input
                  className="form-input"
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
            {q.isPending ? (
              <Loading />
            ) : q.error ? (
              <ErrorBox error={q.error} retry={() => void q.refetch()} />
            ) : (
              <>
                {q.data.items.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>FECHA</th>
                          <th>CANDIDATO</th>
                          <th>PUESTO</th>
                          <th>ESTADO</th>
                          <th>DETALLE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.data.items.map((interview) => (
                          <tr key={interview.id}>
                            <td>
                              {new Date(interview.scheduledAt).toLocaleString(
                                "es-UY",
                              )}
                            </td>
                            <td>
                              <button
                                className="text-link"
                                type="button"
                                onClick={() => setSelected(interview.candidate)}
                              >
                                {interview.candidate.name}
                              </button>
                            </td>
                            <td>
                              <Link
                                className="text-link"
                                href={storeRoutes.adminJob(
                                  interview.candidate.job.id,
                                )}
                              >
                                {interview.candidate.job.title}
                              </Link>
                            </td>
                            <td>
                              {candidateStatuses[interview.candidate.status] ??
                                interview.candidate.status}
                            </td>
                            <td>{interview.body}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="No hay entrevistas en este período" />
                )}
                <ListPagination meta={q.data.meta} onPage={setPage} />
              </>
            )}
          </>
        )}
      </details>
      <Modal
        open={!!selected}
        title={selected?.name ?? "Candidato"}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <CandidateWorkspace
            id={selected.id}
            editable={canEditAdminFeature(user, "ofertas-laborales")}
          />
        )}
      </Modal>
    </section>
  );
}

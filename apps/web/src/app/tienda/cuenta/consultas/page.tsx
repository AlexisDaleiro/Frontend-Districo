"use client";
import { AccessGate } from "@/components/auth";
import { useApi } from "@/components/providers";
import { Empty, ErrorBox, Loading, PageHeading } from "@/components/ui";
import { OperationForm } from "@/components/operation-form";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
function Threads() {
  const params = useSearchParams();
  const form = (
    <OperationForm
      path="account/queries"
      refresh={["account/queries"]}
      button="Enviar consulta"
      transform={(data) => ({
        message: data.get("message"),
        ...(params.get("orderId") ? { orderId: params.get("orderId") } : {}),
      })}
    >
      <label className="field">
        Consulta
        <textarea
          className="form-input"
          name="message"
          required
          minLength={10}
          maxLength={4000}
        />
      </label>
    </OperationForm>
  );
  const q =
    useApi<
      {
        id: string;
        message: string;
        status: string;
        createdAt: string;
        entries: { id: string; body: string; createdAt: string }[];
      }[]
    >("account/queries");
  return (
    <>
      {form}
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !q.data.length ? (
        <Empty title="Todavía no hay consultas vinculadas a tu cuenta" />
      ) : (
        <div>
          {q.data.map((thread) => (
            <section className="admin-record-section" key={thread.id}>
              <h2>
                Consulta del{" "}
                {new Date(thread.createdAt).toLocaleDateString("es-UY")}
              </h2>
              <p>{thread.message}</p>
              {thread.entries.map((entry) => (
                <article className="operation-entry" key={entry.id}>
                  <p>{entry.body}</p>
                  <span>
                    {new Date(entry.createdAt).toLocaleString("es-UY")}
                  </span>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
export default function Page() {
  return (
    <div className="container section">
      <PageHeading title="Mis consultas" />
      <AccessGate>
        <Suspense fallback={<Loading />}>
          <Threads />
        </Suspense>
      </AccessGate>
    </div>
  );
}

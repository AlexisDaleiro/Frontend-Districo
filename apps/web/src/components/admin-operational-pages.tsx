"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { confirmNavigation } from "@/lib/unsaved-changes";
import { useApi, useSession } from "./providers";
import { useAdminListField } from "./admin-list-navigation";
import { canEditAdminFeature } from "@/lib/staff-access";
import { storeRoutes } from "@/lib/store-routes";
import { money, label } from "@/lib/commerce";
import { ListPagination } from "./admin-list-filters";
import { ErrorBox, Loading, Modal } from "./ui";
import { OperationForm } from "./operation-form";
import { MovementImport } from "./movement-import";

type Page<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};
export function useOperationList(resource: string) {
  const [search, setSearch] = useAdminListField("search", ""),
    [filter, setFilter] = useAdminListField("filter", ""),
    [page, setPage] = useAdminListField("page", 1);
  const [term, setTerm] = useState(search);
  useEffect(() => {
    const timeout = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (term) params.set("search", term);
  if (filter) params.set("filter", filter);
  return {
    path: `${resource}?${params}`,
    search,
    filter,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    setFilter: (value: string) => {
      setFilter(value);
      setPage(1);
    },
    setPage,
  };
}
function ReadState({ pending, error }: { pending: boolean; error: unknown }) {
  return pending ? <Loading /> : error ? <ErrorBox error={error} /> : null;
}
type PortfolioRow = {
  id: string;
  businessName: string;
  phone?: string;
  lastOrderAt: string | null;
  delayed: number;
  creditStatus: string;
  replenishment: { productName: string; lastBought: string }[];
};
export function AdminPortfolio() {
  const list = useOperationList("admin/operations/portfolio");
  const q = useApi<Page<PortfolioRow>>(list.path);
  return (
    <>
      <div className="admin-toolbar">
        <label className="field">
          Cliente o RUT
          <input
            className="form-input"
            type="search"
            value={list.search}
            maxLength={120}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          Prioridad
          <select
            className="form-input"
            value={list.filter}
            onChange={(event) => list.setFilter(event.target.value)}
          >
            <option value="">Todas</option>
            <option value="INACTIVE">Sin compras en 30 días</option>
            <option value="DELAYED">Pedidos abiertos hace más de 7 días</option>
            <option value="OVERDUE">Pago atrasado</option>
            <option value="REPLENISH">Posible reposición de alimento</option>
          </select>
        </label>
      </div>
      <ReadState pending={q.isPending} error={q.error} />
      {q.data && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Última compra</th>
                  <th>Pedidos demorados</th>
                  <th>Situación comercial</th>
                  <th>Reposición estimada</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        className="text-link"
                        href={storeRoutes.adminCustomer(row.id)}
                      >
                        {row.businessName}
                      </Link>
                      {row.phone && (
                        <p>
                          <a href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}>
                            {row.phone}
                          </a>
                        </p>
                      )}
                    </td>
                    <td>
                      {row.lastOrderAt
                        ? new Date(row.lastOrderAt).toLocaleDateString("es-UY")
                        : "Sin compras"}
                    </td>
                    <td>{row.delayed}</td>
                    <td>{label(row.creditStatus)}</td>
                    <td>
                      {row.replenishment
                        .map((product) => product.productName)
                        .join(", ") || "Sin historial suficiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination meta={q.data.meta} onPage={list.setPage} />
        </>
      )}
    </>
  );
}
type Match = {
  id: string;
  amount: number;
  payment: {
    id: string;
    voidedAt: string | null;
    order: { id: string; orderNumber: string };
  };
};
type Movement = {
  id: string;
  reference: string;
  occurredAt: string;
  amount: number;
  currency: string;
  description: string;
  matched: number;
  difference: number;
  conflict: boolean;
  reconciliations: Match[];
};
type Payment = {
  id: string;
  amount: number;
  unmatched: number;
  order: { orderNumber: string; currency: string };
};
function Movements() {
  const { user } = useSession(),
    editable = canEditAdminFeature(user, "finanzas");
  const list = useOperationList("admin/operations/finance/movements"),
    q = useApi<Page<Movement>>(list.path);
  const [selected, setSelected] = useState<Movement | null>(null),
    [newMovement, setNewMovement] = useState(false),
    [paymentSearch, setPaymentSearch] = useState("");
  const payments = useApi<Page<Payment>>(
    `admin/operations/finance/payments?limit=100&search=${encodeURIComponent(paymentSearch)}`,
    !!selected,
  );
  const refresh = ["admin/operations/finance/"];
  return (
    <>
      <div className="admin-toolbar">
        <label className="field">
          Referencia o descripción
          <input
            className="form-input"
            type="search"
            maxLength={120}
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </label>
        {editable && (
          <button className="button small" onClick={() => setNewMovement(true)}>
            Cargar movimiento
          </button>
        )}
      </div>
      {editable && (
        <details>
          <summary>Importar movimientos CSV</summary>
          <MovementImport />
        </details>
      )}
      <ReadState pending={q.isPending} error={q.error} />
      {q.data && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th>Conciliado</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.reference}
                      <p>{row.description}</p>
                    </td>
                    <td>
                      {new Date(row.occurredAt).toLocaleDateString("es-UY")}
                    </td>
                    <td>{money(row.amount, row.currency)}</td>
                    <td>{money(row.matched, row.currency)}</td>
                    <td>{money(row.difference, row.currency)}</td>
                    <td>
                      {row.conflict
                        ? "Pago anulado: revisar"
                        : row.difference > 0
                          ? "Por conciliar"
                          : "Conciliado"}
                    </td>
                    <td>
                      <button
                        className="button small secondary"
                        onClick={() => setSelected(row)}
                      >
                        Ver conciliación
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination meta={q.data.meta} onPage={list.setPage} />
        </>
      )}
      <Modal
        open={newMovement}
        onClose={() => setNewMovement(false)}
        title="Cargar movimiento bancario"
      >
        {newMovement && (
          <OperationForm
            path="admin/operations/finance/movements"
            refresh={refresh}
            idempotent={false}
            onDone={() => setNewMovement(false)}
            transform={(data) => ({
              ...Object.fromEntries(data),
              amount: Number(data.get("amount")),
            })}
          >
            <label className="field">
              Referencia única
              <input
                className="form-input"
                name="reference"
                required
                maxLength={120}
              />
            </label>
            <label className="field">
              Fecha
              <input
                className="form-input"
                name="occurredAt"
                type="date"
                required
              />
            </label>
            <label className="field">
              Importe
              <input
                className="form-input"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className="field">
              Moneda
              <select className="form-input" name="currency">
                <option>UYU</option>
                <option>USD</option>
              </select>
            </label>
            <label className="field">
              Descripción
              <input
                className="form-input"
                name="description"
                required
                maxLength={300}
              />
            </label>
          </OperationForm>
        )}
      </Modal>
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Conciliación ${selected?.reference ?? ""}`}
      >
        {selected && (
          <>
            {selected.reconciliations.map((match) => (
              <section className="admin-record-section" key={match.id}>
                <p>
                  {match.payment.order.orderNumber} ·{" "}
                  {money(match.amount, selected.currency)}
                  {match.payment.voidedAt ? " · Pago anulado" : ""}
                </p>
                {editable && (
                  <OperationForm
                    path={`admin/operations/finance/reconciliations/${match.id}/void`}
                    method="PATCH"
                    idempotent={false}
                    refresh={refresh}
                    onDone={() => setSelected(null)}
                    button="Anular asociación"
                  >
                    <label className="field">
                      Motivo de anulación
                      <input
                        className="form-input"
                        name="reason"
                        required
                        minLength={3}
                        maxLength={500}
                      />
                    </label>
                  </OperationForm>
                )}
              </section>
            ))}
            {editable && selected.difference > 0 && (
              <>
                <label className="field">
                  Buscar pago por pedido
                  <input
                    className="form-input"
                    value={paymentSearch}
                    maxLength={120}
                    onChange={(event) => setPaymentSearch(event.target.value)}
                  />
                </label>
                <ReadState
                  pending={payments.isPending}
                  error={payments.error}
                />
                <OperationForm
                  path="admin/operations/finance/reconciliations"
                  refresh={refresh}
                  onDone={() => setSelected(null)}
                  transform={(data) => ({
                    movementId: selected.id,
                    paymentId: data.get("paymentId"),
                    amount: Number(data.get("amount")),
                  })}
                  button="Confirmar conciliación"
                >
                  <label className="field">
                    Pago
                    <select className="form-input" name="paymentId" required>
                      <option value="">Seleccionar pago registrado</option>
                      {payments.data?.items
                        .filter(
                          (payment) =>
                            payment.unmatched > 0 &&
                            payment.order.currency === selected.currency,
                        )
                        .map((payment) => (
                          <option key={payment.id} value={payment.id}>
                            {payment.order.orderNumber} ·{" "}
                            {money(payment.unmatched, payment.order.currency)}{" "}
                            pendientes
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    Importe a asociar
                    <input
                      className="form-input"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={selected.difference}
                      required
                    />
                  </label>
                </OperationForm>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
type Receivable = {
  id: string;
  orderNumber: string;
  currency: string;
  balance: number;
  dueAt: string | null;
  bucket: string;
  customerAccount: { businessName: string } | null;
  followups: {
    id: string;
    note: string;
    nextContactAt: string | null;
    createdAt: string;
  }[];
};
function Receivables() {
  const { user } = useSession(),
    editable = canEditAdminFeature(user, "finanzas");
  const list = useOperationList("admin/operations/finance/receivables"),
    q = useApi<Page<Receivable>>(list.path);
  const [selected, setSelected] = useState<Receivable | null>(null);
  return (
    <>
      <label className="field">
        Pedido o cliente
        <input
          className="form-input"
          type="search"
          maxLength={120}
          value={list.search}
          onChange={(event) => list.setSearch(event.target.value)}
        />
      </label>
      <ReadState pending={q.isPending} error={q.error} />
      {q.data && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Saldo</th>
                  <th>Próximo vencimiento impago</th>
                  <th>Antigüedad</th>
                  <th>Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {q.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={storeRoutes.adminOrder(row.id)}
                        className="text-link"
                      >
                        {row.orderNumber}
                      </Link>
                    </td>
                    <td>{row.customerAccount?.businessName ?? "Sin cuenta"}</td>
                    <td>{money(row.balance, row.currency)}</td>
                    <td>
                      {row.dueAt
                        ? new Date(row.dueAt).toLocaleDateString("es-UY")
                        : "Sin vencimiento"}
                    </td>
                    <td>
                      {{
                        CURRENT: "A vencer",
                        "1_30": "Hasta 30 días",
                        "31_60": "31 a 60 días",
                        "61_90": "61 a 90 días",
                        "90_PLUS": "Más de 90 días",
                      }[row.bucket] ?? row.bucket}
                    </td>
                    <td>
                      <button
                        className="button small secondary"
                        onClick={() => setSelected(row)}
                      >
                        Seguimiento ({row.followups.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination meta={q.data.meta} onPage={list.setPage} />
        </>
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Cobranza ${selected?.orderNumber ?? ""}`}
      >
        {selected && (
          <>
            {selected.followups.map((note) => (
              <p key={note.id}>
                {new Date(note.createdAt).toLocaleDateString("es-UY")} ·{" "}
                {note.note}
                {note.nextContactAt &&
                  ` · Próximo contacto: ${new Date(note.nextContactAt).toLocaleString("es-UY")}`}
              </p>
            ))}
            {editable && (
              <OperationForm
                path={`admin/operations/finance/orders/${selected.id}/followups`}
                refresh={["admin/operations/finance/receivables"]}
                onDone={() => setSelected(null)}
                transform={(data) => ({
                  note: data.get("note"),
                  ...(data.get("nextContactAt")
                    ? {
                        nextContactAt: new Date(
                          String(data.get("nextContactAt")),
                        ).toISOString(),
                      }
                    : {}),
                })}
              >
                <label className="field">
                  Gestión realizada
                  <textarea
                    className="form-input"
                    name="note"
                    required
                    maxLength={2000}
                  />
                </label>
                <label className="field">
                  Próximo contacto
                  <input
                    className="form-input"
                    name="nextContactAt"
                    type="datetime-local"
                  />
                </label>
              </OperationForm>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
export function AdminFinance() {
  const [tab, setTab] = useState("movements");
  const select = (value: string) => {
    if (value !== tab && confirmNavigation()) setTab(value);
  };
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Finanzas">
        <button
          role="tab"
          aria-selected={tab === "movements"}
          className="button small secondary"
          onClick={() => select("movements")}
        >
          Conciliación
        </button>
        <button
          role="tab"
          aria-selected={tab === "receivables"}
          className="button small secondary"
          onClick={() => select("receivables")}
        >
          Vencimientos y cobranza
        </button>
      </div>
      {tab === "movements" ? <Movements /> : <Receivables />}
    </>
  );
}

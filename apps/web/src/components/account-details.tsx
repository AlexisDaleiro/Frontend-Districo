"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { request, useSession } from "./providers";
import { ErrorBox } from "./ui";
import type { Customer, CustomerAddress } from "@/lib/types";

type AddressDraft = { label: string; address: string; city: string; department: string };
const emptyAddress: AddressDraft = { label: "", address: "", city: "", department: "" };

export function AccountDetails({ customer, email }: { customer: Customer; email: string }) {
  const client = useQueryClient();
  const { notify, user } = useSession();
  const [profile, setProfile] = useState({
    businessName: customer.businessName,
    legalName: customer.legalName,
    rut: customer.rut,
  });
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const addresses = customer.addresses ?? [];

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["session"] });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await request("account/me", "PATCH", profile);
      await refresh();
      setProfileFormOpen(false);
      notify("Datos de la cuenta actualizados.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  function editAddress(address?: CustomerAddress) {
    setPendingDelete(null);
    setEditingId(address?.id ?? null);
    setAddressDraft(address
      ? { label: address.label, address: address.address, city: address.city ?? "", department: address.department ?? "" }
      : emptyAddress);
    setAddressFormOpen(true);
    setError(undefined);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await request(
        editingId ? `account/me/addresses/${editingId}` : "account/me/addresses",
        editingId ? "PATCH" : "POST",
        addressDraft,
      );
      await refresh();
      setAddressFormOpen(false);
      setEditingId(null);
      notify(editingId ? "Dirección actualizada." : "Dirección agregada.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAddress(id: string) {
    setError(undefined);
    setBusy(true);
    try {
      await request(`account/me/addresses/${id}`, "DELETE");
      await refresh();
      setPendingDelete(null);
      notify("Dirección eliminada.");
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-details">
      <section className="account-detail-section">
        <div className="account-section-heading">
          <h2>Datos comerciales</h2>
          {!profileFormOpen && <button className="button small secondary" type="button" onClick={() => {
            setProfile({ businessName: customer.businessName, legalName: customer.legalName, rut: customer.rut });
            setProfileFormOpen(true);
          }}><Pencil size={16} /> Editar datos</button>}
        </div>
        <div className="account-readonly-fields">
          <div><span>Nombre comercial</span><strong>{customer.businessName}</strong></div>
          <div><span>Razón social</span><strong>{customer.legalName}</strong></div>
          <div><span>RUT</span><strong>{customer.rut}</strong></div>
          <div><span>Correo electrónico</span><strong>{email}</strong></div>
          <div><span>Teléfono</span><strong>{customer.phone || "Sin registrar"}</strong></div>
          <div><span>Vendedor asignado</span><strong>{customer.salesperson?.name || "Aún no asignado"}</strong></div>
          {customer.salesperson && <>
            <div><span>Correo del vendedor</span><strong><a href={`mailto:${customer.salesperson.user.email}`}>{customer.salesperson.user.email}</a></strong></div>
            <div><span>Teléfono del vendedor</span><strong><a href={`tel:${customer.salesperson.phone.replace(/[^\d+]/g, "")}`}>{customer.salesperson.phone}</a></strong></div>
          </>}
          <div><span>Productos de uso profesional</span><strong>{user?.permissions.includes("CAN_BUY_MEDICATIONS") ? "Habilitados" : "Sin habilitación"}</strong></div>
        </div>
        {profileFormOpen && <form className="account-profile-form" onSubmit={(event) => void saveProfile(event)}>
          <div className="account-edit-fields">
            <label className="field">Nombre comercial
              <input className="form-input" value={profile.businessName} maxLength={120} required onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} />
            </label>
            <label className="field">Razón social
              <input className="form-input" value={profile.legalName} maxLength={160} required onChange={(event) => setProfile({ ...profile, legalName: event.target.value })} />
            </label>
            <label className="field">RUT
              <input className="form-input" value={profile.rut} maxLength={24} required onChange={(event) => setProfile({ ...profile, rut: event.target.value })} />
            </label>
          </div>
          <div className="actions">
            <button className="button small" type="submit" disabled={busy}><Save size={16} /> Guardar datos</button>
            <button className="button small secondary" type="button" disabled={busy} onClick={() => setProfileFormOpen(false)}>Cancelar</button>
          </div>
        </form>}
      </section>

      <section className="account-detail-section" id="direcciones">
        <div className="account-section-heading">
          <h2>Direcciones</h2>
          {!addressFormOpen && (
            <button className="button small secondary" type="button" onClick={() => editAddress()}>
              <Plus size={16} /> Agregar dirección
            </button>
          )}
        </div>
        {addresses.length ? (
          <div className="account-address-list">
            {addresses.map((address, index) => (
              <div className="account-address-row" key={address.id}>
                <div>
                  <strong>{address.label}</strong>
                  {index === 0 && address.label.trim().toLowerCase() !== "principal" && (
                    <span className="muted small-copy"> · Principal</span>
                  )}
                  <p>{[address.address, address.city, address.department].filter(Boolean).join(", ")}</p>
                </div>
                <div className="account-address-actions">
                  {pendingDelete === address.id ? (
                    <>
                      <button className="button small" type="button" disabled={busy} onClick={() => void deleteAddress(address.id)}>Confirmar eliminación</button>
                      <button className="icon-button" type="button" aria-label="Cancelar eliminación" title="Cancelar eliminación" onClick={() => setPendingDelete(null)}><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button className="icon-button" type="button" aria-label={`Editar dirección ${address.label}`} title="Editar dirección" onClick={() => editAddress(address)}><Pencil size={16} /></button>
                      <button className="icon-button" type="button" aria-label={`Eliminar dirección ${address.label}`} title="Eliminar dirección" onClick={() => setPendingDelete(address.id)}><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted small-copy">Todavía no hay direcciones cargadas.</p>}
        {addressFormOpen && (
          <form className="account-address-form" onSubmit={(event) => void saveAddress(event)}>
            <h3>{editingId ? "Editar dirección" : "Nueva dirección"}</h3>
            <div className="account-edit-fields">
              <label className="field">Nombre de la dirección
                <input className="form-input" placeholder="Ej. Depósito" value={addressDraft.label} maxLength={60} required onChange={(event) => setAddressDraft({ ...addressDraft, label: event.target.value })} />
              </label>
              <label className="field">Dirección
                <input className="form-input" value={addressDraft.address} maxLength={200} required onChange={(event) => setAddressDraft({ ...addressDraft, address: event.target.value })} />
              </label>
              <label className="field">Ciudad
                <input className="form-input" value={addressDraft.city} maxLength={100} onChange={(event) => setAddressDraft({ ...addressDraft, city: event.target.value })} />
              </label>
              <label className="field">Departamento
                <input className="form-input" value={addressDraft.department} maxLength={100} onChange={(event) => setAddressDraft({ ...addressDraft, department: event.target.value })} />
              </label>
            </div>
            <div className="actions">
              <button className="button small" type="submit" disabled={busy}><Save size={16} /> Guardar dirección</button>
              <button className="button small secondary" type="button" disabled={busy} onClick={() => setAddressFormOpen(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </section>
      {error !== undefined && <ErrorBox error={error} />}
    </div>
  );
}

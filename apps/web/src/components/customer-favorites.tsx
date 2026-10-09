"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { AccessGate } from './auth';
import { ProductGrid } from './catalog';
import { CatalogPagination } from './catalog-pagination';
import { useApi, useSession } from './providers';
import { Empty, ErrorBox, Loading, PageHeading } from './ui';
import { storeRoutes } from '@/lib/store-routes';
import type { ProductList } from '@/lib/types';

export function CustomerFavoritesPage() {
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => setTerm(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const q = useApi<ProductList>(`account/me/favorites?page=${page}&limit=24&search=${encodeURIComponent(term)}`, user?.role === 'CLIENT');
  const pages = Math.max(1, Math.ceil((q.data?.meta.total ?? 0) / 24));
  if (q.data && page > pages) setPage(pages);
  return <div className="container section customer-favorites-page"><AccessGate>
    {user?.role !== 'CLIENT' ? <Empty title="Los favoritos son exclusivos de clientes" /> : <>
      <PageHeading eyebrow="Mi cuenta" title="Mis favoritos" />
      <div className="favorites-toolbar"><label className="field">Buscar en favoritos<input className="form-input" type="search" maxLength={120} placeholder="Nombre o SKU" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label><Link className="text-link" href={storeRoutes.account}>Mi cuenta</Link></div>
      {q.isPending ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => void q.refetch()} /> : q.data.items.length ? <>
        <p className="muted small-copy">{q.data.meta.total} {q.data.meta.total === 1 ? 'producto guardado' : 'productos guardados'}</p>
        <ProductGrid products={q.data.items} /><CatalogPagination page={page} totalPages={pages} onPageChange={setPage} />
      </> : <Empty title={term ? 'No hay favoritos que coincidan con la búsqueda' : 'Todavía no guardaste productos'}><Heart size={26} aria-hidden="true" /><Link className="button secondary" href={storeRoutes.products}>Explorar catálogo</Link></Empty>}
    </>}
  </AccessGate></div>;
}

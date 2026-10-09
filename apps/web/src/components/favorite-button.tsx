"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { apiQueryKey, request, useApi, useSession } from './providers';

export function FavoriteButton({ productId, name, className = '' }: { productId: string; name: string; className?: string }) {
  const { user, notify } = useSession();
  const client = useQueryClient();
  const path = 'account/me/favorites/ids';
  const ids = useApi<string[]>(path, user?.role === 'CLIENT');
  const selected = ids.data?.includes(productId) ?? false;
  const mutation = useMutation({
    mutationFn: (favorite: boolean) => request(`account/me/favorites/${encodeURIComponent(productId)}`, favorite ? 'POST' : 'DELETE', favorite ? {} : undefined),
    onSuccess: (_, favorite) => {
      client.setQueryData<string[]>(apiQueryKey(path, user?.id), (saved = []) => favorite ? [...new Set([...saved, productId])] : saved.filter((id) => id !== productId));
      void client.invalidateQueries({ predicate: (query) => query.queryKey[1] === user?.id && typeof query.queryKey[2] === 'string' && query.queryKey[2].startsWith('account/me/favorites') && query.queryKey[2] !== path });
      notify(favorite ? 'Producto guardado en favoritos.' : 'Producto quitado de favoritos.');
    },
    onError: (error) => notify(error instanceof Error ? error.message : 'No se pudo actualizar el favorito.'),
  });
  if (user?.role !== 'CLIENT') return null;
  const title = `${selected ? 'Quitar de' : 'Agregar a'} favoritos: ${name}`;
  return <button type="button" className={`icon-button favorite-button ${selected ? 'is-favorite' : ''} ${className}`} aria-label={title} title={title} aria-pressed={selected}
    disabled={ids.isPending || mutation.isPending} onClick={() => ids.error ? void ids.refetch() : mutation.mutate(!selected)}>
    <Heart size={19} fill={selected ? 'currentColor' : 'none'} />
  </button>;
}

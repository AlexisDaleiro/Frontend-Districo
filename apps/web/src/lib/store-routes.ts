const root = "/tienda";
const categories = `${root}/categorias`;

export const storeRoutes = {
  home: root,
  products: `${root}/productos`,
  categories,
  category: (id: string) => `${categories}/${encodeURIComponent(id)}`,
  product: (slug: string) => `${root}/producto/${encodeURIComponent(slug)}`,
  brands: `${root}/marcas`,
  company: `${root}/empresa`,
  contact: `${root}/contacto`,
  cart: `${root}/carrito`,
  checkout: `${root}/checkout`,
  account: `${root}/cuenta`,
  orders: `${root}/cuenta/pedidos`,
  order: (id: string) => `${root}/cuenta/pedidos/${encodeURIComponent(id)}`,
  login: `${root}/ingresar`,
  recoverAccess: `${root}/recuperar-acceso`,
  requestAccount: `${root}/solicitar-cuenta`,
  admin: `${root}/admin`,
  adminSection: (section: string) => `${root}/admin/${encodeURIComponent(section)}`,
} as const;

export function withSearch(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

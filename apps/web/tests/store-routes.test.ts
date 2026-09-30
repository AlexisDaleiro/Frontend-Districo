import { describe, expect, it } from "vitest";
import { storeRoutes, withSearch } from "../src/lib/store-routes";

describe("rutas de la tienda", () => {
  it("mantiene la entrada y las áreas del ecommerce bajo /tienda", () => {
    expect(storeRoutes.home).toBe("/tienda");
    expect(storeRoutes.products).toBe("/tienda/productos");
    expect(storeRoutes.categories).toBe("/tienda/categorias");
    expect(storeRoutes.cart).toBe("/tienda/carrito");
    expect(storeRoutes.checkout).toBe("/tienda/checkout");
    expect(storeRoutes.orders).toBe("/tienda/cuenta/pedidos");
    expect(storeRoutes.admin).toBe("/tienda/admin");
  });

  it("codifica parámetros de ruta y conserva filtros de búsqueda", () => {
    expect(storeRoutes.category("alimento mascotas")).toBe(
      "/tienda/categorias/alimento%20mascotas",
    );
    expect(storeRoutes.product("línea/extra")).toBe(
      "/tienda/producto/l%C3%ADnea%2Fextra",
    );
    expect(withSearch(storeRoutes.products, new URLSearchParams())).toBe(
      storeRoutes.products,
    );
    expect(withSearch(storeRoutes.products, new URLSearchParams({ search: "bio fresh" }))).toBe(
      "/tienda/productos?search=bio+fresh",
    );
  });
});

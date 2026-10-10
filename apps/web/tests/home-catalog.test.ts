import { describe, expect, it } from "vitest";
import { homeCategories, homePromoBrand } from "../src/lib/home-catalog";
import { demoPetStage, juvenileStageId } from "../src/lib/pet-stage";

describe("home conectado al catálogo", () => {
  it("conserva categorías nuevas y renombradas sin mostrar hijos ni ramas inactivas", () => {
    const result = homeCategories([
      { id: "dogs", name: "Perros" },
      { id: "cats", name: "Felinos" },
      { id: "new", name: "Acuarios" },
      { id: "child", name: "Alimento", parentId: "cats" },
      { id: "inactive", name: "No publicar", active: false },
      { id: "hidden-child", name: "No publicar hijo", parentId: "inactive" },
    ]);
    expect(result.species.map((category) => category.id)).toEqual(["dogs"]);
    expect(result.other.map((category) => category.id)).toEqual(["new", "cats"]);
  });
  it("toma el nombre y logo actual, y retira las marcas inactivas o eliminadas", () => {
    expect(homePromoBrand([{ id: "b", slug: "biofresh", name: "Biofresh nuevo", imageUrl: "/nuevo.png" }], "biofresh", "Biofresh"))
      .toMatchObject({ id: "b", name: "Biofresh nuevo", logo: "/nuevo.png" });
    expect(homePromoBrand([{ id: "b", slug: "biofresh", name: "Biofresh", active: false }], "biofresh", "Biofresh")).toBeUndefined();
    expect(homePromoBrand([], "biofresh", "Biofresh")).toBeUndefined();
    expect(homePromoBrand([{ id: "b", name: "Three Dogs" }], "three-dogs", "Three Dogs")?.logo).toBe("/images/brands/three-dogs.png");
  });
  it("encuentra la etapa por identificador estable, aunque el nombre del valor cambie", () => {
    expect(juvenileStageId([demoPetStage])).toBe("demo-etapa-juvenil");
    expect(juvenileStageId([{ ...demoPetStage, values: [{ id: "j", slug: "cachorro-gatito", value: "Junior" }] }])).toBe("j");
    expect(juvenileStageId([{ ...demoPetStage, active: false }])).toBeUndefined();
  });
});

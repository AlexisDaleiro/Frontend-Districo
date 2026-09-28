import { readFile, rename, stat, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import robotsParser from "robots-parser";
import { CatalogSnapshot, parseSnapshot } from "./catalog/districo";
import {
  PresentationCapture,
  PresentationRecord,
  parseDistricoPresentation,
  parseProviderDescriptionPresentation,
  parseProviderTitlePresentation,
} from "./catalog/official-presentations";
import type { CatalogSource } from "./catalog/sources";

const AGENT = "DistricoCatalogImporter/1.0";
const SOURCES: CatalogSource[] = ["DISTRICO", "RAICOR", "MAGNIS"];
const execFileAsync = promisify(execFile);

async function readSnapshot(
  path: string,
  source: CatalogSource,
): Promise<CatalogSnapshot> {
  if ((await stat(path)).size > 25 * 1024 * 1024)
    throw new Error(`Archivo ${source} demasiado grande.`);
  const snapshot = parseSnapshot(JSON.parse(await readFile(path, "utf8")));
  if (snapshot.source !== source)
    throw new Error(
      `El archivo de ${source} no corresponde al origen esperado.`,
    );
  return snapshot;
}

function initialCapture(snapshots: CatalogSnapshot[]): PresentationCapture {
  return {
    version: 1,
    sources: snapshots.map(({ source, fetchedAt, total }) => ({
      source,
      fetchedAt,
      total,
    })),
    products: snapshots.flatMap((snapshot) =>
      snapshot.products.map((item): PresentationRecord => {
        const titleSizes =
          snapshot.source === "DISTRICO"
            ? []
            : parseProviderTitlePresentation(
                snapshot.source,
                item.name,
                item.categories.map((category) => category.name),
              );
        const descriptionSizes =
          snapshot.source === "DISTRICO" || titleSizes.length
            ? []
            : parseProviderDescriptionPresentation(item.description);
        const sizes = titleSizes.length ? titleSizes : descriptionSizes;
        return {
          source: snapshot.source,
          externalId: item.externalId,
          sourceUrl: item.sourceUrl,
          sourceName: item.name,
          raw:
            snapshot.source === "DISTRICO"
              ? null
              : descriptionSizes.length
                ? item.description
                : item.name,
          sizes,
          status:
            snapshot.source === "DISTRICO"
              ? "unvisited"
              : sizes.length
                ? "verified"
                : "not-published",
          method:
            snapshot.source === "DISTRICO"
              ? "official-product-page"
              : descriptionSizes.length
                ? "official-catalog-description"
                : "official-catalog-title",
          capturedAt:
            snapshot.source === "DISTRICO" ? null : snapshot.fetchedAt,
        };
      }),
    ),
  };
}

async function saveCapture(path: string, capture: PresentationCapture) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, JSON.stringify(capture, null, 2) + "\n");
  await rename(temporary, path);
}

async function fetchPublic(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    // curl uses the OS trust store on Windows, where Node's bundled CA set does not
    // validate this site's intermediate certificate. TLS verification stays enabled.
    const { stdout } = await execFileAsync(
      process.platform === "win32" ? "curl.exe" : "curl",
      [
        "--silent",
        "--show-error",
        "--max-time",
        "30",
        "--max-redirs",
        "0",
        "--proto",
        "=https",
        "--user-agent",
        AGENT,
        "--header",
        "Accept: text/html, text/plain",
        "--write-out",
        "\n__HTTP_STATUS__:%{http_code}",
        url,
      ],
      { maxBuffer: 5_000_000 },
    );
    const match = /\n__HTTP_STATUS__:(\d{3})$/.exec(stdout);
    if (!match) throw new Error("Respuesta HTTP sin estado verificable.");
    const response = new Response(stdout.slice(0, match.index), {
      status: Number(match[1]),
    });
    if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
      const retry = response.headers.get("retry-after");
      const waitMs =
        retry && /^\d+$/.test(retry)
          ? Number(retry) * 1000
          : 1000 * 2 ** attempt;
      await response.body?.cancel();
      if (waitMs > 60000)
        throw new Error("El proveedor solicita una pausa prolongada.");
      await sleep(Math.max(1000, waitMs));
      continue;
    }
    if (response.status === 429)
      throw new Error(
        "DISTRICO limito el acceso; captura pausada para reanudar luego.",
      );
    return response;
  }
  throw new Error("No se pudo consultar la ficha oficial.");
}

async function main() {
  const { values } = parseArgs({
    options: {
      districo: { type: "string" },
      raicor: { type: "string" },
      magnis: { type: "string" },
      output: { type: "string" },
      limit: { type: "string" },
      "recheck-unpublished": { type: "boolean", default: false },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "npm run presentations:capture -- --districo <captura.json> --raicor <captura.json> --magnis <captura.json> --output apps/api/imports/presentations.json",
    );
    console.log(
      "Se puede reanudar con el mismo --output. --limit N consulta solo N fichas de DISTRICO.",
    );
    console.log(
      "--recheck-unpublished vuelve a consultar las fichas sin tamanos detectados.",
    );
    return;
  }
  if (!values.districo || !values.raicor || !values.magnis || !values.output)
    throw new Error("Indicar las tres capturas oficiales y --output.");
  const limit =
    values.limit === undefined ? Number.MAX_SAFE_INTEGER : Number(values.limit);
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new Error("--limit debe ser un entero positivo.");
  const snapshots = await Promise.all(
    SOURCES.map((source) =>
      readSnapshot(
        values[source.toLowerCase() as "districo" | "raicor" | "magnis"]!,
        source,
      ),
    ),
  );
  const expected = initialCapture(snapshots);
  const output = resolve(values.output);
  let capture = expected;
  try {
    const previous = JSON.parse(
      await readFile(output, "utf8"),
    ) as PresentationCapture;
    if (
      previous.version !== 1 ||
      JSON.stringify(previous.sources) !== JSON.stringify(expected.sources) ||
      previous.products.length !== expected.products.length ||
      previous.products.some(
        (item, index) =>
          item.source !== expected.products[index].source ||
          item.externalId !== expected.products[index].externalId ||
          item.sourceUrl !== expected.products[index].sourceUrl,
      )
    )
      throw new Error(
        "La captura previa no coincide con los catalogos de entrada.",
      );
    capture = previous;
    for (let index = 0; index < capture.products.length; index++) {
      if (capture.products[index].source !== "DISTRICO")
        capture.products[index] = expected.products[index];
    }
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ))
      throw error;
  }

  const robotsUrl = "https://www.districo.com.uy/robots.txt";
  const robotsResponse = await fetchPublic(robotsUrl);
  if (!robotsResponse.ok)
    throw new Error("No se pudo verificar robots.txt de DISTRICO.");
  const robots = robotsParser(robotsUrl, await robotsResponse.text());
  const crawlDelay = robots.getCrawlDelay(AGENT);
  if (
    crawlDelay !== undefined &&
    (!Number.isFinite(crawlDelay) || crawlDelay > 60)
  ) {
    throw new Error("Crawl-delay requiere ejecucion posterior.");
  }
  const delay = Math.max(1000, (crawlDelay ?? 0) * 1000);
  const pending = capture.products
    .filter(
      (item) =>
        item.source === "DISTRICO" &&
        (["unvisited", "fetch-failed"].includes(item.status) ||
          (values["recheck-unpublished"] && item.status === "not-published")),
    )
    .sort(
      (a, b) =>
        Number(b.status === "not-published") -
        Number(a.status === "not-published"),
    )
    .slice(0, limit);
  await saveCapture(output, capture);
  console.log(
    `Catalogos oficiales: ${capture.products.length} productos; fichas DISTRICO pendientes: ${pending.length}.`,
  );
  let processed = 0;
  for (let start = 0; start < pending.length; start += 3) {
    const batch = pending.slice(start, start + 3);
    const updated = await Promise.all(
      batch.map(async (item, index): Promise<PresentationRecord> => {
        await sleep(delay * index);
        if (robots.isAllowed(item.sourceUrl, AGENT) !== true) {
          return {
            ...item,
            status: "fetch-failed",
            raw: "robots.txt no permite esta URL",
            capturedAt: new Date().toISOString(),
          };
        }
        try {
          const response = await fetchPublic(item.sourceUrl);
          if (!response.ok) {
            await response.body?.cancel();
            return {
              ...item,
              status: "fetch-failed",
              raw: `HTTP ${response.status}`,
              capturedAt: new Date().toISOString(),
            };
          }
          const html = await response.text();
          const parsed = parseDistricoPresentation(html);
          return {
            ...item,
            raw: parsed?.raw ?? null,
            sizes: parsed?.sizes ?? [],
            status: parsed?.sizes.length ? "verified" : "not-published",
            capturedAt: new Date().toISOString(),
          };
        } catch (error) {
          if (
            error instanceof Error &&
            /limito el acceso|pausa prolongada/.test(error.message)
          )
            throw error;
          return {
            ...item,
            status: "fetch-failed",
            raw: "Error de lectura",
            capturedAt: new Date().toISOString(),
          };
        }
      }),
    );
    for (const item of updated) {
      const index = capture.products.findIndex(
        (entry) =>
          entry.source === item.source && entry.externalId === item.externalId,
      );
      capture.products[index] = item;
    }
    processed += updated.length;
    await saveCapture(output, capture);
    if (processed % 12 === 0 || processed === pending.length) {
      const verified = capture.products.filter(
        (item) => item.status === "verified",
      ).length;
      console.log(
        `Fichas DISTRICO: ${processed}/${pending.length}; tamaños verificados en ${verified} productos de los tres origenes.`,
      );
    }
    await sleep(delay);
  }
  const counts = Object.fromEntries(
    SOURCES.map((source) => [
      source,
      {
        verified: capture.products.filter(
          (item) => item.source === source && item.status === "verified",
        ).length,
        notPublished: capture.products.filter(
          (item) => item.source === source && item.status === "not-published",
        ).length,
        failed: capture.products.filter(
          (item) => item.source === source && item.status === "fetch-failed",
        ).length,
      },
    ]),
  );
  console.log(JSON.stringify(counts));
  console.log(
    `Captura guardada en ${output}. No se modifico la base de datos.`,
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudo capturar presentaciones.",
  );
  process.exitCode = 1;
});

import { chromium, devices } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const origin = new URL(process.argv[2] || "http://127.0.0.1:3007");
if (
  origin.protocol !== "https:" &&
  !(
    origin.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(origin.hostname)
  )
)
  throw new Error("Use HTTPS or a local preview.");
const runs = Math.max(1, Math.min(20, Number(process.env.PERF_RUNS || 5)));
const source = readFileSync(
  createRequire(import.meta.url).resolve("next/dist/compiled/web-vitals"),
  "utf8",
);
const injection = `(() => { const module={exports:{}}; const __dirname=''; ${source}; window.__labVitals={}; for(const name of ['LCP','INP','CLS','FCP','TTFB']) module.exports['on'+name]((metric)=>{window.__labVitals[name]=metric.value},{reportAllChanges:true}); })();`;
function percentile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * fraction,
    floor = Math.floor(index);
  return (
    sorted[floor] + (sorted[Math.ceil(index)] - sorted[floor]) * (index - floor)
  );
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];
  try {
    for (const device of ["DESKTOP", "MOBILE"])
      for (const path of ["/", "/tienda/ingresar"]) {
        const samples = [];
        for (let attempt = 0; attempt < runs; attempt++) {
          const context = await browser.newContext(
            device === "MOBILE"
              ? devices["Pixel 7"]
              : { viewport: { width: 1366, height: 900 } },
          );
          const page = await context.newPage();
          let serverErrors = 0,
            javascriptErrors = 0;
          page.on("response", (response) => {
            if (response.status() >= 500) serverErrors++;
          });
          page.on("pageerror", () => javascriptErrors++);
          await page.addInitScript(injection);
          const cdp = await context.newCDPSession(page);
          await cdp.send("Network.enable");
          if (device === "MOBILE") {
            await cdp.send("Network.emulateNetworkConditions", {
              offline: false,
              latency: 150,
              downloadThroughput: (1.6 * 1024 * 1024) / 8,
              uploadThroughput: (750 * 1024) / 8,
            });
            await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          }
          let failed = false;
          try {
            await page.goto(new URL(path, origin.origin).href, {
              waitUntil: "load",
              timeout: 45000,
            });
            await page.waitForTimeout(2500);
            await page.keyboard.press("Tab");
            await page.keyboard.press("Tab");
            await page.waitForTimeout(1200);
          } catch {
            failed = true;
          }
          const timing = await page
            .evaluate(() => {
              const resources = performance.getEntriesByType("resource");
              return {
                vitals: window.__labVitals || {},
                images: resources
                  .filter((entry) => entry.initiatorType === "img")
                  .map((entry) => entry.duration),
                api: resources
                  .filter((entry) => entry.initiatorType === "fetch")
                  .map((entry) => entry.duration),
              };
            })
            .catch(() => ({ vitals: {}, images: [], api: [] }));
          samples.push({ ...timing, failed, serverErrors, javascriptErrors });
          await context.close();
        }
        const names = ["LCP", "INP", "CLS", "FCP", "TTFB"];
        const metrics = Object.fromEntries(
          names.map((name) => {
            const values = samples
              .map((sample) => sample.vitals[name])
              .filter(Number.isFinite);
            return [
              name,
              {
                samples: values.length,
                p50: percentile(values, 0.5),
                p75: percentile(values, 0.75),
                p95: percentile(values, 0.95),
              },
            ];
          }),
        );
        const result = {
          path,
          device,
          coldBrowser: true,
          network:
            device === "MOBILE"
              ? "1.6 Mbps, 150 ms latency, CPU x4"
              : "Unthrottled",
          runs,
          metrics,
          imageDownloadP75: percentile(
            samples.flatMap((sample) => sample.images),
            0.75,
          ),
          fetchP75: percentile(
            samples.flatMap((sample) => sample.api),
            0.75,
          ),
          failedRuns: samples.filter((sample) => sample.failed).length,
          serverErrors: samples.reduce(
            (sum, sample) => sum + sample.serverErrors,
            0,
          ),
          javascriptErrors: samples.reduce(
            (sum, sample) => sum + sample.javascriptErrors,
            0,
          ),
        };
        results.push(result);
        console.log(JSON.stringify(result));
      }
  } finally {
    await browser.close();
  }
  const folder = resolve(__dirname, "../.performance-results");
  mkdirSync(folder, { recursive: true });
  const file = resolve(
    folder,
    `performance-${origin.hostname}-${Date.now()}.json`,
  );
  writeFileSync(
    file,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        origin: origin.origin,
        source: "CONTROLLED_LAB_NOT_FIELD",
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Report: ${file}`);
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

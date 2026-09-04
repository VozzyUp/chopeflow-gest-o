// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// DEPLOY_TARGET=node gera uma saída Node pura (.output/server/index.mjs),
// usada na hospedagem Hostinger. Sem essa variável nada muda no preview.
const alvoNode = process.env["DEPLOY_TARGET"] === "node";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // The runtime rejects an explicit nodejs_compat flag once the compatibility
  // date reaches 2026-08-04 (it became the default). Pin the date to the day
  // before so the generated deploy config stays valid.
  nitro: {
    compatibilityDate: "2026-08-03",
    ...(alvoNode ? { preset: "node-server" } : {}),
  } as { preset?: string },
});

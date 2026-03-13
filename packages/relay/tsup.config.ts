import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/server.ts"],
    format: ["esm"],
    clean: true,
    sourcemap: true,
    dts: true,
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    sourcemap: true,
    dts: true,
    target: "node20",
  },
]);

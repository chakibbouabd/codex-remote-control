import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  target: "node20",
  dts: true,
});

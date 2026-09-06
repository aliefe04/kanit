import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/kanit": "src/bin/kanit.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  banner: {
    js: "",
  },
  esbuildOptions(options) {
    // Shebang is placed in bin/kanit.ts or handled specifically
  },
});

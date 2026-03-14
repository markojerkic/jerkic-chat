import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

// const ReactCompilerConfig = {
//   target: "19",
//   sources: (filename: string) => {
//     return filename.indexOf("app") !== -1;
//   },
// };

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    // babel({
    //   filter: /\.[jt]sx?$/,
    //   babelConfig: {
    //     presets: ["@babel/preset-typescript"], // if you use TypeScript
    //     plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
    //   },
    // }),
  ],
});

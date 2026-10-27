import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const requestedBase = env.VITE_BASE_PATH?.trim() || "/";
  const leadingSlashBase = requestedBase.startsWith("/")
    ? requestedBase
    : `/${requestedBase}`;
  const base = leadingSlashBase.endsWith("/")
    ? leadingSlashBase
    : `${leadingSlashBase}/`;

  return {
    base,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      target: "es2022",
    },
  };
});

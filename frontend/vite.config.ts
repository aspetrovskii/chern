import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useMockApi = env.VITE_USE_MOCK_API === "true";

  return {
    plugins: [react()],
    server: {
      proxy: useMockApi
        ? {}
        : {
            "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
          },
    },
  };
});

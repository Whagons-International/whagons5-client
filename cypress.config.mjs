import { defineConfig } from "cypress";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: {
        resolve: {
          // Array format: specific mocks MUST come before the general "@" alias
          // so Vite resolves them first when scanning imports.
          alias: [
            // Mock heavy modules so action-handler tests don't pull in
            // Redux, IndexedDB, Firebase, API layers, or YAML config parsing.
            { find: "@/store/store", replacement: path.resolve(__dirname, "cypress/support/mockStore.ts") },
            { find: "@/store/genericSlices", replacement: path.resolve(__dirname, "cypress/support/mockGenericSlices.ts") },
            { find: "@/store/reducers/tasksSlice", replacement: path.resolve(__dirname, "cypress/support/mockTasksSlice.ts") },
            { find: "@/utils/logger", replacement: path.resolve(__dirname, "cypress/support/mockLogger.ts") },
            // General "@" alias (must be last)
            { find: "@", replacement: path.resolve(__dirname, "./src") },
          ],
        },
      },
    },
    specPattern: "cypress/component/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/component.ts",
  },
});

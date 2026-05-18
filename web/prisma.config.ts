import path from "path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  datasource: {
    url: `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
  },
});

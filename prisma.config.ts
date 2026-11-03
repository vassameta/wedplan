import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Allow client generation during Docker/CI builds where no live DB is configured.
    // Migrations at runtime receive the real DATABASE_URL from the environment.
    url: process.env.DATABASE_URL ?? "postgresql://build:build@127.0.0.1:5432/wedplan?schema=public"
  }
});

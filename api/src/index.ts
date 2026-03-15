import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import appsRoutes from "./routes/apps";
import ssoRoutes from "./routes/sso";
import adminRoutes from "./routes/admin";
import type { Env } from "./types/env";

const app = new Hono<{ Bindings: Env }>();

// Middleware global
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Autoriser les domaines Filtreplante
      if (
        origin.endsWith(".filtreplante.com") ||
        origin.endsWith(".pages.dev") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return origin;
      }
      return "https://filtreplante.com";
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/auth/users", usersRoutes);
app.route("/api/apps", appsRoutes);
app.route("/api/sso", ssoRoutes);
app.route("/api/admin", adminRoutes);

// Route de santé
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "filtreplante-auth" });
});

// Route racine
app.get("/", (c) => {
  return c.json({
    service: "Filtreplante Auth API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth/*",
      users: "/api/auth/users",
      apps: "/api/apps",
      sso: "/api/sso/*",
      admin: "/api/admin/*",
    },
  });
});

// Error handler
app.onError(errorHandler);

export default app;

import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Middleware de gestion d'erreurs
 * Capture toutes les erreurs et retourne une réponse JSON structurée
 */
export function errorHandler(err: Error, c: Context) {
  console.error("Error:", err);

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        statusCode: err.status,
      },
      err.status
    );
  }

  // Erreur générique
  return c.json(
    {
      error: err.message || "Erreur interne du serveur",
      statusCode: 500,
    },
    500
  );
}

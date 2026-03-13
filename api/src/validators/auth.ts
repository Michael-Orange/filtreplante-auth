import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(3, "Username doit contenir au moins 3 caractères").max(50),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.enum(["admin", "user"]).default("user"),
  actif: z.boolean().default(true),
  peut_acces_stock: z.boolean().default(false),
  peut_acces_prix: z.boolean().default(false),
  peut_admin_maintenance: z.boolean().default(false),
  peut_acces_construction: z.boolean().default(false),
  peut_acces_shelly: z.boolean().default(false),
});

export const UpdateUserSchema = z.object({
  nom: z.string().min(1, "Nom requis").optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  role: z.enum(["admin", "user"]).optional(),
  actif: z.boolean().optional(),
  peut_acces_stock: z.boolean().optional(),
  peut_acces_prix: z.boolean().optional(),
  peut_admin_maintenance: z.boolean().optional(),
  peut_acces_construction: z.boolean().optional(),
  peut_acces_shelly: z.boolean().optional(),
});

export const ChangePasswordSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

import { z } from "zod";

export const loginUserSchema = z.object({
  email: z
    .email("Invalid email address")
    .trim()
    .toLowerCase()
    .max(255, "Email must be at most 255 characters"),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required")
    .max(128, "Password must be at most 128 characters"),
  remember: z.boolean().optional().default(false),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type LoginUserBody = z.input<typeof loginUserSchema>;

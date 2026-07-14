import { z } from "zod";

export const registerUserSchema = z
  .object({
    name: z.string().trim().max(100, "Name must be at most 100 characters").optional(),
    email: z
      .email("Invalid email address")
      .trim()
      .toLowerCase()
      .max(255, "Email must be at most 255 characters"),
    password: z
      .string({ error: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string({ error: "Confirm password is required" }),
    remember: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type RegisterUserBody = z.input<typeof registerUserSchema>;

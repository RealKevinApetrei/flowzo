import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z
  .object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const createTradeSchema = z.object({
  obligation_id: z.string().uuid().optional(),
  original_due_date: z.string().date(),
  new_due_date: z.string().date(),
  amount_pence: z.number().int().positive(),
  fee_pence: z.number().int().nonnegative(),
});

export const lenderPreferencesSchema = z.object({
  min_apr: z.number().min(0).max(100),
  max_shift_days: z.number().int().min(1).max(90),
  risk_bands: z.array(z.enum(["A", "B", "C"])).min(1),
  auto_match_enabled: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type LenderPreferencesInput = z.infer<typeof lenderPreferencesSchema>;

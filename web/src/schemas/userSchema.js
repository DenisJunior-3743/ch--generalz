import { z } from "zod";

export const userSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("admin"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
  z.object({
    role: z.literal("staff"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    staff_id: z.coerce.number().int().positive("Select a staff member"),
  }),
  z.object({
    role: z.literal("student"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    student_reg_number: z.string().min(1, "Select a student"),
  }),
]);

export const userDefaultValues = {
  role: "staff",
  username: "",
  password: "",
  staff_id: "",
  student_reg_number: "",
};

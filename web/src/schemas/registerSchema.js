import { z } from "zod";
import { parseRegNumber } from "../utils/format";

export const registerStudentSchema = z.object({
  reg_number: z
    .string()
    .min(1, "Registration number is required")
    .transform(parseRegNumber),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerStudentDefaultValues = {
  reg_number: "",
  password: "",
};

export const registerStaffSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerStaffDefaultValues = {
  email: "",
  password: "",
};

import { z } from "zod";

const currentYear = new Date().getFullYear();

export const studentSchema = z.object({
  reg_number: z
    .string()
    .min(1, "Registration number is required")
    .refine((v) => !v.includes("/"), {
      message: "Can't contain '/' — use dashes instead, e.g. FCI-BSE-2026-0001",
    }),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone_number: z.string().min(1, "Phone number is required"),
  gender: z.enum(["male", "female", "other"], { message: "Select a gender" }),
  faculty_id: z.coerce.number().int().positive("Select a faculty"),
  program_id: z.coerce.number().int().positive("Select a program"),
  intake_year: z.coerce
    .number({ message: "Enter a valid year" })
    .int("Enter a valid year")
    .min(2000, "Enter a valid year")
    .max(currentYear + 1, "Enter a valid year"),
});

export const studentDefaultValues = {
  reg_number: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  gender: "",
  faculty_id: "",
  program_id: "",
  intake_year: "",
};

export const STEP_1_FIELDS = [
  "reg_number",
  "first_name",
  "last_name",
  "email",
  "phone_number",
  "gender",
];

export const STEP_2_FIELDS = ["faculty_id", "program_id", "intake_year"];

// reg_number is fixed once set (it's the primary key and appears in every
// other URL referencing this student) — PUT /students/{reg_number} doesn't
// accept it in the body at all, per API_REFERENCE.md.
export const studentUpdateSchema = studentSchema.omit({ reg_number: true });

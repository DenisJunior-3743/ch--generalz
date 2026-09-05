import { z } from "zod";

export const staffSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone_number: z.string().min(1, "Phone number is required"),
  gender: z.enum(["male", "female", "other"], {
    message: "Select a gender",
  }),
});

export const staffDefaultValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  gender: "",
};

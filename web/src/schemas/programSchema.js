import { z } from "zod";

export const programSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  faculty_id: z.coerce.number().int().positive("Select a faculty"),
});

export const programDefaultValues = {
  code: "",
  name: "",
  faculty_id: "",
};

import { z } from "zod";

export const facultySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
});

export const facultyDefaultValues = {
  code: "",
  name: "",
};

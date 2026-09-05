import { z } from "zod";

export const courseSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
});

export const courseDefaultValues = {
  code: "",
  name: "",
};

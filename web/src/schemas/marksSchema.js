import { z } from "zod";
import { requiredScore } from "./shared";

export const markRowSchema = z.object({
  course_id: z.coerce.number().int().positive("Select a course"),
  score: requiredScore(),
});

export const marksFormSchema = z.object({
  semester_id: z.coerce.number().int().positive("Select a semester"),
  marks: z.array(markRowSchema).min(1, "Add at least one mark"),
});

export const markEditSchema = markRowSchema.extend({
  semester_id: z.coerce.number().int().positive("Select a semester"),
});

export const markRowDefaultValues = { course_id: "", score: "" };

export const marksFormDefaultValues = {
  semester_id: "",
  marks: [markRowDefaultValues],
};

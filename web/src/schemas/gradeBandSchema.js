import { z } from "zod";
import { requiredScore } from "./shared";

export const GRADE_VALUES = ["A", "B+", "B", "C+", "C", "D+", "D", "F"];

export const gradeBandSchema = z
  .object({
    min_score: requiredScore("Enter a minimum score"),
    max_score: requiredScore("Enter a maximum score"),
    grade: z.enum(GRADE_VALUES, { message: "Select a grade" }),
  })
  .refine((data) => data.min_score <= data.max_score, {
    message: "Minimum score must be less than or equal to maximum score",
    path: ["min_score"],
  });

export const gradeBandDefaultValues = {
  min_score: "",
  max_score: "",
  grade: "",
};

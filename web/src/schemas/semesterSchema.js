import { z } from "zod";

export const semesterSchema = z.object({
  academic_year: z.string().min(1, "Academic year is required"),
  term: z.enum(["sem_1", "sem_2"], { message: "Select a term" }),
});

export const semesterDefaultValues = {
  academic_year: "",
  term: "",
};

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitMarks } from "../api/marks";
import {
  marksFormSchema,
  marksFormDefaultValues,
  markRowDefaultValues,
} from "../schemas/marksSchema";
import { useCourses } from "../hooks/useCourses";
import { useSemesters } from "../hooks/useSemesters";
import { formatRegNumber, formatTerm } from "../utils/format";
import StudentPicker from "../components/StudentPicker";
import StudentMarksTable from "../components/StudentMarksTable";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";

export default function MarksEntryPage() {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(marksFormSchema),
    mode: "onBlur",
    defaultValues: marksFormDefaultValues,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "marks",
  });

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [banner, setBanner] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { status: coursesStatus, courses } = useCourses();
  const { status: semestersStatus, semesters } = useSemesters();

  useEffect(() => {
    if (semesters.length > 0) {
      setValue("semester_id", String(semesters[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters]);

  useEffect(() => {
    if (selectedStudent) {
      replace([markRowDefaultValues]);
      setBanner(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent]);

  const courseOptions = courses.map((c) => ({
    value: String(c.id),
    label: `${c.name} (${c.code})`,
  }));

  const semesterOptions = semesters.map((s) => ({
    value: String(s.id),
    label: `${s.academic_year} — ${formatTerm(s.term)}`,
  }));

  async function onSubmit(values) {
    setBanner(null);
    const rows = values.marks.map((row) => ({
      course_id: row.course_id,
      score: row.score,
      semester_id: values.semester_id,
    }));

    try {
      const created = await submitMarks(selectedStudent.reg_number, rows);
      setBanner({
        type: "success",
        message: `${created.length} mark${created.length === 1 ? "" : "s"} recorded for ${selectedStudent.first_name} ${selectedStudent.last_name}.`,
      });
      replace([markRowDefaultValues]);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.detail)) {
        error.detail.forEach((issue) => {
          const path = issue.loc?.slice(1).join(".");
          if (path) {
            setError(path, { type: "server", message: issue.msg });
          }
        });
        setBanner({ type: "error", message: "Please fix the highlighted fields." });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message:
            error.detail ||
            "One of these marks already exists for this student, course, and semester — nothing was saved. Fix the conflicting row and resubmit.",
        });
      } else if (error.status === 404) {
        setBanner({
          type: "error",
          message: error.detail || "One of the selected values no longer exists.",
        });
      } else {
        setBanner({
          type: "error",
          message: error.detail || "Something went wrong. Please try again.",
        });
      }
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Marks Entry</h1>
        <p>Pick an already-registered student, then submit a batch of marks for them.</p>
      </div>

      {!selectedStudent && (
        <div className="panel">
          <h2>Select a student</h2>
          <StudentPicker onSelect={setSelectedStudent} />
        </div>
      )}

      {selectedStudent && (
        <>
          <div className="panel">
            <div className="selected-student-bar">
              <h2>
                {selectedStudent.first_name} {selectedStudent.last_name}{" "}
                <span className="selected-student-reg">
                  ({formatRegNumber(selectedStudent.reg_number)})
                </span>
              </h2>
              <button
                type="button"
                className="pagination-button"
                onClick={() => setSelectedStudent(null)}
              >
                Change student
              </button>
            </div>

            {banner && (
              <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
            )}

            {courses.length === 0 && coursesStatus === "loaded" && (
              <p className="form-banner form-banner--error">
                No courses exist yet — ask an admin to add one first.
              </p>
            )}
            {semesters.length === 0 && semestersStatus === "loaded" && (
              <p className="form-banner form-banner--error">
                No semesters exist yet — ask an admin to add one first.
              </p>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-grid">
                <SelectField
                  label="Semester"
                  options={semesterOptions}
                  error={errors.semester_id}
                  disabled={semestersStatus !== "loaded" || semesters.length === 0}
                  {...register("semester_id")}
                />
              </div>

              <div className="mt-1 flex flex-col gap-3">
                {fields.map((field, index) => (
                  <div
                    className="grid grid-cols-1 items-end gap-2 border-b border-border pb-3.5 sm:grid-cols-[minmax(0,1fr)_140px_36px] sm:gap-3 sm:border-none sm:pb-0"
                    key={field.id}
                  >
                    <SelectField
                      label="Course"
                      options={courseOptions}
                      error={errors.marks?.[index]?.course_id}
                      disabled={coursesStatus !== "loaded" || courses.length === 0}
                      {...register(`marks.${index}.course_id`)}
                    />
                    <TextField
                      label="Score"
                      type="number"
                      min="0"
                      max="100"
                      error={errors.marks?.[index]?.score}
                      {...register(`marks.${index}.score`)}
                    />
                    <button
                      type="button"
                      className="flex h-[38px] w-auto shrink-0 cursor-pointer items-center justify-center justify-self-end rounded-md border border-border bg-surface px-3.5 text-lg leading-none text-muted-foreground enabled:hover:border-danger/25 enabled:hover:bg-danger/8 enabled:hover:text-danger-dark disabled:cursor-not-allowed disabled:opacity-35 sm:w-9 sm:px-0"
                      aria-label="Remove this mark"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => append(markRowDefaultValues)}
                >
                  + Add another mark
                </button>
                <button
                  type="submit"
                  className="form-submit"
                  disabled={isSubmitting || courses.length === 0 || semesters.length === 0}
                >
                  {isSubmitting ? "Submitting…" : "Submit marks"}
                </button>
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>Existing marks</h2>
            <StudentMarksTable
              regNumber={selectedStudent.reg_number}
              courses={courses}
              semesters={semesters}
              refreshKey={refreshKey}
            />
          </div>
        </>
      )}
    </div>
  );
}

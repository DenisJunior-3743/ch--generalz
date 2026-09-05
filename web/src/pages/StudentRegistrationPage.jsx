import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStudent } from "../api/students";
import {
  studentSchema,
  studentDefaultValues,
  STEP_1_FIELDS,
} from "../schemas/studentSchema";
import { useFaculties } from "../hooks/useFaculties";
import { usePrograms } from "../hooks/usePrograms";
import { formatRegNumber } from "../utils/format";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";
import Stepper from "../components/Stepper";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const STEPS = ["Bio data", "University info"];

export default function StudentRegistrationPage() {
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentSchema),
    mode: "onBlur",
    defaultValues: studentDefaultValues,
  });

  const [step, setStep] = useState(1);
  const [banner, setBanner] = useState(null);

  const { status: facultiesStatus, faculties } = useFaculties();
  const facultyIdValue = watch("faculty_id");

  const {
    status: programsStatus,
    programs,
  } = usePrograms(facultyIdValue, { enabled: Boolean(facultyIdValue) });

  useEffect(() => {
    setValue("program_id", "");
  }, [facultyIdValue, setValue]);

  const facultyOptions = faculties.map((f) => ({
    value: String(f.id),
    label: `${f.name} (${f.code})`,
  }));

  const programOptions = programs.map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.code})`,
  }));

  async function handleNext() {
    const valid = await trigger(STEP_1_FIELDS);
    if (valid) setStep(2);
  }

  function handleBack() {
    setStep(1);
  }

  function onInvalid(formErrors) {
    if (STEP_1_FIELDS.some((field) => formErrors[field])) {
      setStep(1);
    }
  }

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createStudent(values);
      setBanner({
        type: "success",
        message: `${created.first_name} ${created.last_name} (${formatRegNumber(created.reg_number)}) was registered successfully.`,
      });
      reset();
      setStep(1);
    } catch (error) {
      if (Array.isArray(error.detail)) {
        let jumpToStep1 = false;
        error.detail.forEach((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          if (field) {
            setError(field, { type: "server", message: issue.msg });
            if (STEP_1_FIELDS.includes(field)) jumpToStep1 = true;
          }
        });
        setBanner({ type: "error", message: "Please fix the highlighted fields." });
        if (jumpToStep1) setStep(1);
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
        <h1>Student Registration</h1>
        <p>Bio data, then faculty, program, and intake year — one submission at the end.</p>
      </div>

      <div className="panel">
        <Stepper steps={STEPS} current={step} />

        {banner && (
          <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
          {step === 1 && (
            <>
              <div className="form-grid">
                <TextField
                  label="Registration number"
                  placeholder="e.g. FCI-BSE-2026-0001"
                  error={errors.reg_number}
                  {...register("reg_number")}
                />
                <TextField
                  label="First name"
                  error={errors.first_name}
                  {...register("first_name")}
                />
                <TextField
                  label="Last name"
                  error={errors.last_name}
                  {...register("last_name")}
                />
                <TextField
                  label="Email"
                  type="email"
                  error={errors.email}
                  {...register("email")}
                />
                <TextField
                  label="Phone number"
                  type="tel"
                  error={errors.phone_number}
                  {...register("phone_number")}
                />
                <SelectField
                  label="Gender"
                  options={GENDER_OPTIONS}
                  error={errors.gender}
                  {...register("gender")}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="form-submit" onClick={handleNext}>
                  Next
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {facultiesStatus === "loaded" && faculties.length === 0 && (
                <p className="form-banner form-banner--error">
                  No faculties exist yet — ask an admin to add one first.
                </p>
              )}

              <div className="form-grid">
                <SelectField
                  label="Faculty"
                  options={facultyOptions}
                  error={errors.faculty_id}
                  disabled={facultiesStatus !== "loaded" || faculties.length === 0}
                  {...register("faculty_id")}
                />
                <SelectField
                  label="Program"
                  options={programOptions}
                  placeholder={facultyIdValue ? "Select..." : "Select a faculty first"}
                  error={errors.program_id}
                  disabled={
                    !facultyIdValue || programsStatus !== "loaded" || programs.length === 0
                  }
                  {...register("program_id")}
                />
                <TextField
                  label="Intake year"
                  type="number"
                  min="2000"
                  placeholder="e.g. 2026"
                  error={errors.intake_year}
                  {...register("intake_year")}
                />
              </div>

              {facultyIdValue && programsStatus === "loaded" && programs.length === 0 && (
                <p className="form-banner form-banner--error">
                  No programs exist yet under this faculty — ask an admin to add one first.
                </p>
              )}

              <div className="form-actions">
                <button type="button" className="pagination-button" onClick={handleBack}>
                  Back
                </button>
                <button type="submit" className="form-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Registering…" : "Register student"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

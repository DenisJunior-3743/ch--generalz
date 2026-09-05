import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerStaff, registerStudent } from "../api/auth";
import {
  registerStudentSchema,
  registerStudentDefaultValues,
  registerStaffSchema,
  registerStaffDefaultValues,
} from "../schemas/registerSchema";
import TextField from "../components/forms/TextField";
import logo from "../assets/must-logo.png";

const ROLE_TABS = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Staff" },
];

export default function RegisterPage() {
  const [role, setRole] = useState("student");
  const [banner, setBanner] = useState(null);
  const navigate = useNavigate();

  const isStudent = role === "student";
  const schema = isStudent ? registerStudentSchema : registerStaffSchema;
  const defaultValues = isStudent ? registerStudentDefaultValues : registerStaffDefaultValues;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  function handleRoleChange(nextRole) {
    if (nextRole === role) return;
    setRole(nextRole);
    setBanner(null);
    reset(nextRole === "student" ? registerStudentDefaultValues : registerStaffDefaultValues);
  }

  async function onSubmit(values) {
    setBanner(null);
    try {
      if (isStudent) {
        await registerStudent(values);
      } else {
        await registerStaff(values);
      }
      // Both endpoints log the caller in immediately (return a valid
      // token), but we deliberately don't use it — send them to /login to
      // sign in with what they just chose, confirming it actually works.
      // The account's username is always the reg_number/email itself now
      // (the backend derives it — see registerSchema.js), never a value
      // the person typed separately.
      navigate("/login", {
        replace: true,
        state: { registered: true, username: isStudent ? values.reg_number : values.email },
      });
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.detail)) {
        error.detail.forEach((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          if (field) {
            setError(field, { type: "server", message: issue.msg });
          }
        });
        setBanner({ type: "error", message: "Please fix the highlighted fields." });
      } else if (error.status === 404) {
        setBanner({
          type: "error",
          message:
            error.detail ||
            (isStudent
              ? "No student found with that registration number — contact your registrar."
              : "No staff record found with that email — ask an admin to add you first."),
        });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "That account or username already exists.",
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
    <div className="flex min-h-screen items-center justify-center bg-navy p-5">
      <div className="w-full max-w-[380px] rounded-lg bg-surface px-8 py-9 text-center shadow-md">
        <img src={logo} alt="MUST logo" className="mb-3 h-14 w-14 object-contain" />
        <h1 className="mb-1 text-[19px] text-foreground">MUST Records System</h1>
        <p className="mb-6 text-sm text-muted-foreground">Set up your login</p>

        <div className="mb-5 flex gap-1.5 rounded-md bg-background p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`flex-1 cursor-pointer rounded-sm px-3 py-2 text-[13.5px] font-semibold ${
                role === tab.value
                  ? "bg-surface text-navy shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => handleRoleChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {banner && (
          <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 text-left">
          {isStudent ? (
            <TextField
              label="Registration number"
              placeholder="e.g. FCI-BSE-2026-0001"
              error={errors.reg_number}
              {...register("reg_number")}
            />
          ) : (
            <TextField
              label="Email"
              type="email"
              placeholder="e.g. jane@example.com"
              error={errors.email}
              {...register("email")}
            />
          )}

          <TextField
            label="Choose a password"
            type="password"
            error={errors.password}
            {...register("password")}
          />

          <button type="submit" className="form-submit mt-1 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-navy no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

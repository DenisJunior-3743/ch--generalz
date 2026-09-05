import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser } from "../api/users";
import { userSchema, userDefaultValues } from "../schemas/userSchema";
import { useAdminOverview } from "../hooks/useAdminOverview";
import { formatRegNumber } from "../utils/format";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "student", label: "Student" },
  { value: "admin", label: "Admin" },
];

export default function UsersPage() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(userSchema),
    mode: "onBlur",
    defaultValues: userDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const { status, data, message, refetch } = useAdminOverview();
  const roleValue = watch("role");

  const staffOptions = useMemo(
    () =>
      (data?.staff ?? []).map((s) => ({
        value: String(s.id),
        label: `${s.first_name} ${s.last_name} (${s.email})`,
      })),
    [data],
  );

  const studentOptions = useMemo(
    () =>
      (data?.students ?? []).map((s) => ({
        value: s.reg_number,
        label: `${s.first_name} ${s.last_name} (${formatRegNumber(s.reg_number)})`,
      })),
    [data],
  );

  const staffLookup = useMemo(() => {
    const map = new Map();
    (data?.staff ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [data]);

  async function onSubmit(values) {
    setBanner(null);
    const payload = {
      password: values.password,
      role: values.role,
    };
    // Staff/student accounts have their username derived server-side (from
    // the linked staff member's email / student's reg_number) — the
    // backend rejects the field entirely for those roles. Only admin
    // accounts have a freely chosen username.
    if (values.role === "admin") payload.username = values.username;
    if (values.role === "staff") payload.staff_id = values.staff_id;
    if (values.role === "student") payload.student_reg_number = values.student_reg_number;

    try {
      const created = await createUser(payload);
      setBanner({
        type: "success",
        message: `Account "${created.username}" (${created.role}) was created successfully.`,
      });
      reset({ ...userDefaultValues, role: values.role });
      refetch();
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
          message: error.detail || "The referenced staff member or student doesn't exist.",
        });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "That username — or that person — already has an account.",
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
        <h1>Users</h1>
        <p>Login accounts — separate from Staff/Student records. One account per person.</p>
      </div>

      <div className="panel">
        <h2>Create account</h2>

        {banner && (
          <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-grid">
            {roleValue === "admin" && (
              <TextField
                label="Username"
                placeholder="e.g. Admin"
                error={errors.username}
                {...register("username")}
              />
            )}
            <TextField
              label="Password"
              type="password"
              error={errors.password}
              {...register("password")}
            />
            <SelectField
              label="Role"
              options={ROLE_OPTIONS}
              error={errors.role}
              {...register("role")}
            />
            {roleValue === "staff" && (
              <SelectField
                label="Staff member"
                options={staffOptions}
                error={errors.staff_id}
                disabled={status !== "loaded" || staffOptions.length === 0}
                {...register("staff_id")}
              />
            )}
            {roleValue === "student" && (
              <SelectField
                label="Student"
                options={studentOptions}
                error={errors.student_reg_number}
                disabled={status !== "loaded" || studentOptions.length === 0}
                {...register("student_reg_number")}
              />
            )}
          </div>

          {roleValue === "staff" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Username will be that staff member's email — set automatically.
            </p>
          )}
          {roleValue === "student" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Username will be that student's registration number — set automatically.
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="form-submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Existing accounts</h2>

        {status === "loading" && <p className="list-state">Loading accounts…</p>}

        {status === "error" && (
          <div className="list-state list-state--error">
            <p>{message}</p>
            <button type="button" className="pagination-button" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {status === "loaded" && data.users.length === 0 && (
          <p className="list-state">No accounts yet.</p>
        )}

        {status === "loaded" && data.users.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Role</th>
                  <th scope="col">Linked to</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td className="capitalize">{user.role}</td>
                    <td>
                      {user.staff_id
                        ? (() => {
                            const s = staffLookup.get(user.staff_id);
                            return s ? `${s.first_name} ${s.last_name}` : `Staff #${user.staff_id}`;
                          })()
                        : user.student_reg_number
                          ? formatRegNumber(user.student_reg_number)
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

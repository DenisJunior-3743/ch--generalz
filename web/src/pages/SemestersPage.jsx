import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSemester, updateSemester, deleteSemester } from "../api/semesters";
import { semesterSchema, semesterDefaultValues } from "../schemas/semesterSchema";
import { useSemesters } from "../hooks/useSemesters";
import { formatTerm } from "../utils/format";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

const TERM_OPTIONS = [
  { value: "sem_1", label: "Semester 1" },
  { value: "sem_2", label: "Semester 2" },
];

function EditSemesterModal({ semester, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(semesterSchema),
    defaultValues: { academic_year: semester.academic_year, term: semester.term },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateSemester(semester.id, values);
      onSaved();
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.detail)) {
        error.detail.forEach((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          if (field) setError(field, { type: "server", message: issue.msg });
        });
        setBanner({ type: "error", message: "Please fix the highlighted fields." });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "That academic year and term already exists.",
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
    <Modal title="Edit semester" onClose={onClose}>
      {banner && (
        <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <TextField
            label="Academic year"
            error={errors.academic_year}
            {...register("academic_year")}
          />
          <SelectField
            label="Term"
            options={TERM_OPTIONS}
            error={errors.term}
            {...register("term")}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="pagination-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="form-submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SemestersPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "semesters", "create");
  const canUpdate = hasPermission(user, "semesters", "update");
  const canDelete = hasPermission(user, "semesters", "delete");
  const showActions = canUpdate || canDelete;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(semesterSchema),
    mode: "onBlur",
    defaultValues: semesterDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const { status, semesters, message, refetch } = useSemesters();

  const [editingSemester, setEditingSemester] = useState(null);
  const [deletingSemester, setDeletingSemester] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createSemester(values);
      setBanner({
        type: "success",
        message: `${created.academic_year} (${formatTerm(created.term)}) was created successfully.`,
      });
      reset();
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
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "That academic year and term already exists.",
        });
      } else {
        setBanner({
          type: "error",
          message: error.detail || "Something went wrong. Please try again.",
        });
      }
    }
  }

  async function handleDeleteConfirm() {
    setDeletePending(true);
    try {
      await deleteSemester(deletingSemester.id);
      setBanner({
        type: "success",
        message: `${deletingSemester.academic_year} (${formatTerm(deletingSemester.term)}) was deleted.`,
      });
      setDeletingSemester(null);
      refetch();
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this semester.",
      });
      setDeletingSemester(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Semesters</h1>
        <p>One row per academic term — staff pick the current one when entering marks.</p>
      </div>

      {canCreate && (
        <div className="panel">
          <h2>Add semester</h2>

          {banner && (
            <p className={`form-banner form-banner--${banner.type}`}>
              {banner.message}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
              <TextField
                label="Academic year"
                placeholder="e.g. 2025/2026"
                error={errors.academic_year}
                {...register("academic_year")}
              />
              <SelectField
                label="Term"
                options={TERM_OPTIONS}
                error={errors.term}
                {...register("term")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="form-submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add semester"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Semester list</h2>

        {status === "loading" && <p className="list-state">Loading semesters…</p>}

        {status === "error" && (
          <div className="list-state list-state--error">
            <p>{message}</p>
            <button type="button" className="pagination-button" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {status === "loaded" && semesters.length === 0 && (
          <p className="list-state">No semesters yet — add the first one above.</p>
        )}

        {status === "loaded" && semesters.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Academic year</th>
                  <th scope="col">Term</th>
                  {showActions && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {semesters.map((semester) => (
                  <tr key={semester.id}>
                    <td>{semester.academic_year}</td>
                    <td>{formatTerm(semester.term)}</td>
                    {showActions && (
                      <td>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              aria-label={`Edit ${semester.academic_year}`}
                              onClick={() => setEditingSemester(semester)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                            >
                              <IconEdit />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete ${semester.academic_year}`}
                              onClick={() => setDeletingSemester(semester)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-danger/8 hover:text-danger-dark [&>svg]:h-4 [&>svg]:w-4"
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingSemester && (
        <EditSemesterModal
          key={editingSemester.id}
          semester={editingSemester}
          onClose={() => setEditingSemester(null)}
          onSaved={() => {
            setEditingSemester(null);
            setBanner({ type: "success", message: "Semester updated." });
            refetch();
          }}
        />
      )}

      {deletingSemester && (
        <ConfirmDialog
          title="Delete semester"
          message={`Delete ${deletingSemester.academic_year} (${formatTerm(deletingSemester.term)})? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingSemester(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

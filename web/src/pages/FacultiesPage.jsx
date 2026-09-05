import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFaculty, updateFaculty, deleteFaculty } from "../api/faculties";
import { facultySchema, facultyDefaultValues } from "../schemas/facultySchema";
import { useFaculties } from "../hooks/useFaculties";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import TextField from "../components/forms/TextField";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

function EditFacultyModal({ faculty, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(facultySchema),
    defaultValues: { code: faculty.code, name: faculty.name },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateFaculty(faculty.id, values);
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
          message: error.detail || "A faculty with that code already exists.",
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
    <Modal title="Edit faculty" onClose={onClose}>
      {banner && (
        <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <TextField label="Code" error={errors.code} {...register("code")} />
          <TextField label="Name" error={errors.name} {...register("name")} />
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

export default function FacultiesPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "faculties", "create");
  const canUpdate = hasPermission(user, "faculties", "update");
  const canDelete = hasPermission(user, "faculties", "delete");
  const showActions = canUpdate || canDelete;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(facultySchema),
    mode: "onBlur",
    defaultValues: facultyDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const { status, faculties, message, refetch } = useFaculties();

  const [editingFaculty, setEditingFaculty] = useState(null);
  const [deletingFaculty, setDeletingFaculty] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createFaculty(values);
      setBanner({
        type: "success",
        message: `${created.name} (${created.code}) was created successfully.`,
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
          message: error.detail || "A faculty with that code already exists.",
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
      await deleteFaculty(deletingFaculty.id);
      setBanner({ type: "success", message: `${deletingFaculty.name} was deleted.` });
      setDeletingFaculty(null);
      refetch();
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this faculty.",
      });
      setDeletingFaculty(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Faculties</h1>
        <p>Manage the list of faculties — feeds the faculty selector everywhere else.</p>
      </div>

      {canCreate && (
        <div className="panel">
          <h2>Add faculty</h2>

          {banner && (
            <p className={`form-banner form-banner--${banner.type}`}>
              {banner.message}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
              <TextField
                label="Code"
                placeholder="e.g. SCI"
                error={errors.code}
                {...register("code")}
              />
              <TextField
                label="Name"
                placeholder="e.g. Faculty of Science"
                error={errors.name}
                {...register("name")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="form-submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add faculty"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Faculty list</h2>

        {status === "loading" && <p className="list-state">Loading faculties…</p>}

        {status === "error" && (
          <div className="list-state list-state--error">
            <p>{message}</p>
            <button type="button" className="pagination-button" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {status === "loaded" && faculties.length === 0 && (
          <p className="list-state">No faculties yet — add the first one above.</p>
        )}

        {status === "loaded" && faculties.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Name</th>
                  {showActions && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {faculties.map((faculty) => (
                  <tr key={faculty.id}>
                    <td>{faculty.code}</td>
                    <td>{faculty.name}</td>
                    {showActions && (
                      <td>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              aria-label={`Edit ${faculty.name}`}
                              onClick={() => setEditingFaculty(faculty)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                            >
                              <IconEdit />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete ${faculty.name}`}
                              onClick={() => setDeletingFaculty(faculty)}
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

      {editingFaculty && (
        <EditFacultyModal
          key={editingFaculty.id}
          faculty={editingFaculty}
          onClose={() => setEditingFaculty(null)}
          onSaved={() => {
            setEditingFaculty(null);
            setBanner({ type: "success", message: "Faculty updated." });
            refetch();
          }}
        />
      )}

      {deletingFaculty && (
        <ConfirmDialog
          title="Delete faculty"
          message={`Delete ${deletingFaculty.name} (${deletingFaculty.code})? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingFaculty(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

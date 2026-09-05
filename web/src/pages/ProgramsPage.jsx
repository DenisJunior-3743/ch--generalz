import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProgram, updateProgram, deleteProgram } from "../api/programs";
import { programSchema, programDefaultValues } from "../schemas/programSchema";
import { useFaculties } from "../hooks/useFaculties";
import { usePrograms } from "../hooks/usePrograms";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

function EditProgramModal({ program, facultyOptions, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(programSchema),
    defaultValues: {
      code: program.code,
      name: program.name,
      faculty_id: String(program.faculty_id),
    },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateProgram(program.id, values);
      onSaved();
    } catch (error) {
      if (error.status === 422 && Array.isArray(error.detail)) {
        error.detail.forEach((issue) => {
          const field = issue.loc?.[issue.loc.length - 1];
          if (field) setError(field, { type: "server", message: issue.msg });
        });
        setBanner({ type: "error", message: "Please fix the highlighted fields." });
      } else if (error.status === 404) {
        setBanner({
          type: "error",
          message: error.detail || "That faculty no longer exists.",
        });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "A program with that code already exists.",
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
    <Modal title="Edit program" onClose={onClose}>
      {banner && (
        <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <TextField label="Code" error={errors.code} {...register("code")} />
          <TextField label="Name" error={errors.name} {...register("name")} />
          <SelectField
            label="Faculty"
            options={facultyOptions}
            error={errors.faculty_id}
            {...register("faculty_id")}
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

export default function ProgramsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "programs", "create");
  const canUpdate = hasPermission(user, "programs", "update");
  const canDelete = hasPermission(user, "programs", "delete");
  const showActions = canUpdate || canDelete;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(programSchema),
    mode: "onBlur",
    defaultValues: programDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const [filterFacultyId, setFilterFacultyId] = useState("");

  const [editingProgram, setEditingProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const {
    status: facultiesStatus,
    faculties,
    message: facultiesMessage,
  } = useFaculties();

  const {
    status: programsStatus,
    programs,
    message: programsMessage,
    refetch: refetchPrograms,
  } = usePrograms(filterFacultyId);

  const facultyOptions = useMemo(
    () => faculties.map((f) => ({ value: String(f.id), label: `${f.name} (${f.code})` })),
    [faculties],
  );

  const facultyLookup = useMemo(() => {
    const map = new Map();
    faculties.forEach((f) => map.set(f.id, f));
    return map;
  }, [faculties]);

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createProgram(values);
      setBanner({
        type: "success",
        message: `${created.name} (${created.code}) was created successfully.`,
      });
      reset();
      refetchPrograms();
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
          message: error.detail || "That faculty no longer exists.",
        });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "A program with that code already exists.",
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
      await deleteProgram(deletingProgram.id);
      setBanner({ type: "success", message: `${deletingProgram.name} was deleted.` });
      setDeletingProgram(null);
      refetchPrograms();
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this program.",
      });
      setDeletingProgram(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Programs</h1>
        <p>Degree programmes, each tied to a faculty.</p>
      </div>

      {canCreate && (
        <div className="panel">
          <h2>Add program</h2>

          {banner && (
            <p className={`form-banner form-banner--${banner.type}`}>
              {banner.message}
            </p>
          )}

          {facultiesStatus === "loaded" && faculties.length === 0 && (
            <p className="form-banner form-banner--error">
              No faculties exist yet — add one on the Faculties page first.
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
              <TextField
                label="Code"
                placeholder="e.g. BSCS"
                error={errors.code}
                {...register("code")}
              />
              <TextField
                label="Name"
                placeholder="e.g. BSc Computer Science"
                error={errors.name}
                {...register("name")}
              />
              <SelectField
                label="Faculty"
                options={facultyOptions}
                error={errors.faculty_id}
                disabled={facultiesStatus !== "loaded" || faculties.length === 0}
                {...register("faculty_id")}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="form-submit"
                disabled={isSubmitting || faculties.length === 0}
              >
                {isSubmitting ? "Adding…" : "Add program"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Program list</h2>

        <div className="panel-toolbar">
          <div className="panel-filter">
            <label htmlFor="program-faculty-filter">Faculty</label>
            <select
              id="program-faculty-filter"
              value={filterFacultyId}
              onChange={(e) => setFilterFacultyId(e.target.value)}
            >
              <option value="">All faculties</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {facultiesStatus === "error" && (
          <p className="list-state list-state--error">{facultiesMessage}</p>
        )}

        {programsStatus === "loading" && <p className="list-state">Loading programs…</p>}

        {programsStatus === "error" && (
          <div className="list-state list-state--error">
            <p>{programsMessage}</p>
            <button type="button" className="pagination-button" onClick={refetchPrograms}>
              Retry
            </button>
          </div>
        )}

        {programsStatus === "loaded" && programs.length === 0 && (
          <p className="list-state">No programs yet.</p>
        )}

        {programsStatus === "loaded" && programs.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Name</th>
                  <th scope="col">Faculty</th>
                  {showActions && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {programs.map((program) => (
                  <tr key={program.id}>
                    <td>{program.code}</td>
                    <td>{program.name}</td>
                    <td>
                      {facultyLookup.get(program.faculty_id)?.name ??
                        `Faculty #${program.faculty_id}`}
                    </td>
                    {showActions && (
                      <td>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              aria-label={`Edit ${program.name}`}
                              onClick={() => setEditingProgram(program)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                            >
                              <IconEdit />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete ${program.name}`}
                              onClick={() => setDeletingProgram(program)}
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

      {editingProgram && (
        <EditProgramModal
          key={editingProgram.id}
          program={editingProgram}
          facultyOptions={facultyOptions}
          onClose={() => setEditingProgram(null)}
          onSaved={() => {
            setEditingProgram(null);
            setBanner({ type: "success", message: "Program updated." });
            refetchPrograms();
          }}
        />
      )}

      {deletingProgram && (
        <ConfirmDialog
          title="Delete program"
          message={`Delete ${deletingProgram.name} (${deletingProgram.code})? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingProgram(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

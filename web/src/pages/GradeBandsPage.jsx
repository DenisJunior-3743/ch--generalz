import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGradeBand, updateGradeBand, deleteGradeBand } from "../api/gradeBands";
import {
  gradeBandSchema,
  gradeBandDefaultValues,
  GRADE_VALUES,
} from "../schemas/gradeBandSchema";
import { useGradeBands } from "../hooks/useGradeBands";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

const GRADE_OPTIONS = GRADE_VALUES.map((g) => ({ value: g, label: g }));

function EditGradeBandModal({ band, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(gradeBandSchema),
    defaultValues: {
      min_score: band.min_score,
      max_score: band.max_score,
      grade: band.grade,
    },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateGradeBand(band.id, values);
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
          message:
            error.detail || "That grade or score range conflicts with an existing band.",
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
    <Modal title="Edit grade band" onClose={onClose}>
      {banner && (
        <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <TextField
            label="Minimum score"
            type="number"
            min="0"
            max="100"
            error={errors.min_score}
            {...register("min_score")}
          />
          <TextField
            label="Maximum score"
            type="number"
            min="0"
            max="100"
            error={errors.max_score}
            {...register("max_score")}
          />
          <SelectField
            label="Grade"
            options={GRADE_OPTIONS}
            error={errors.grade}
            {...register("grade")}
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

export default function GradeBandsPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "grade_bands", "create");
  const canUpdate = hasPermission(user, "grade_bands", "update");
  const canDelete = hasPermission(user, "grade_bands", "delete");
  const showActions = canUpdate || canDelete;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(gradeBandSchema),
    mode: "onBlur",
    defaultValues: gradeBandDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const { status, gradeBands, message, refetch } = useGradeBands();

  const [editingBand, setEditingBand] = useState(null);
  const [deletingBand, setDeletingBand] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createGradeBand(values);
      setBanner({
        type: "success",
        message: `Grade ${created.grade} (${created.min_score}–${created.max_score}) was created successfully.`,
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
          message: error.detail || "That grade or score range conflicts with an existing band.",
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
      await deleteGradeBand(deletingBand.id);
      setBanner({ type: "success", message: `Grade ${deletingBand.grade} was deleted.` });
      setDeletingBand(null);
      refetch();
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this grade band.",
      });
      setDeletingBand(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Grade Bands</h1>
        <p>
          The scoring scale — the backend looks up a mark's letter grade from this
          table automatically. Staff never see or choose this; they just enter a raw
          score.
        </p>
      </div>

      {canCreate && (
        <div className="panel">
          <h2>Add grade band</h2>

          {banner && (
            <p className={`form-banner form-banner--${banner.type}`}>
              {banner.message}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
              <TextField
                label="Minimum score"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 80"
                error={errors.min_score}
                {...register("min_score")}
              />
              <TextField
                label="Maximum score"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 100"
                error={errors.max_score}
                {...register("max_score")}
              />
              <SelectField
                label="Grade"
                options={GRADE_OPTIONS}
                error={errors.grade}
                {...register("grade")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="form-submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add grade band"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Grade scale</h2>

        {status === "loading" && <p className="list-state">Loading grade bands…</p>}

        {status === "error" && (
          <div className="list-state list-state--error">
            <p>{message}</p>
            <button type="button" className="pagination-button" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {status === "loaded" && gradeBands.length === 0 && (
          <p className="list-state">
            No grade bands yet — marks can't be entered until the scale is set up.
          </p>
        )}

        {status === "loaded" && gradeBands.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Grade</th>
                  <th scope="col">Minimum</th>
                  <th scope="col">Maximum</th>
                  {showActions && <th scope="col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {gradeBands.map((band) => (
                  <tr key={band.id}>
                    <td>{band.grade}</td>
                    <td>{band.min_score}</td>
                    <td>{band.max_score}</td>
                    {showActions && (
                      <td>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              aria-label={`Edit grade ${band.grade}`}
                              onClick={() => setEditingBand(band)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                            >
                              <IconEdit />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete grade ${band.grade}`}
                              onClick={() => setDeletingBand(band)}
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

      {editingBand && (
        <EditGradeBandModal
          key={editingBand.id}
          band={editingBand}
          onClose={() => setEditingBand(null)}
          onSaved={() => {
            setEditingBand(null);
            setBanner({ type: "success", message: "Grade band updated." });
            refetch();
          }}
        />
      )}

      {deletingBand && (
        <ConfirmDialog
          title="Delete grade band"
          message={`Delete grade ${deletingBand.grade} (${deletingBand.min_score}–${deletingBand.max_score})? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingBand(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

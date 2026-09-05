import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listMarksForStudent, updateMark, deleteMark } from "../api/marks";
import { markEditSchema } from "../schemas/marksSchema";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import { formatSemester } from "../utils/format";
import TextField from "./forms/TextField";
import SelectField from "./forms/SelectField";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { IconEdit, IconTrash } from "./icons";

function EditMarkModal({ mark, regNumber, courseOptions, semesterOptions, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(markEditSchema),
    defaultValues: {
      course_id: String(mark.course_id),
      score: mark.score,
      semester_id: String(mark.semester_id),
    },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateMark(regNumber, mark.id, values);
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
          message: error.detail || "That course or semester no longer exists.",
        });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message:
            error.detail || "This student already has a different mark for that course and semester.",
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
    <Modal title="Edit mark" onClose={onClose}>
      {banner && (
        <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <SelectField
            label="Course"
            options={courseOptions}
            error={errors.course_id}
            {...register("course_id")}
          />
          <TextField
            label="Score"
            type="number"
            min="0"
            max="100"
            error={errors.score}
            {...register("score")}
          />
          <SelectField
            label="Semester"
            options={semesterOptions}
            error={errors.semester_id}
            {...register("semester_id")}
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

export default function StudentMarksTable({
  regNumber,
  courses,
  semesters,
  refreshKey,
}) {
  const { user } = useAuth();
  const canUpdate = hasPermission(user, "marks", "update");
  const canDelete = hasPermission(user, "marks", "delete");
  const showActions = canUpdate || canDelete;

  const [state, setState] = useState({ status: "loading", marks: [], message: "" });
  const [editingMark, setEditingMark] = useState(null);
  const [deletingMark, setDeletingMark] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const courseLookup = useMemo(() => {
    const map = new Map();
    courses.forEach((c) => map.set(c.id, c));
    return map;
  }, [courses]);

  const semesterLookup = useMemo(() => {
    const map = new Map();
    semesters.forEach((s) => map.set(s.id, s));
    return map;
  }, [semesters]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
    [courses],
  );

  const semesterOptions = useMemo(
    () => semesters.map((s) => ({ value: String(s.id), label: formatSemester(s) })),
    [semesters],
  );

  const fetchMarks = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const marks = await listMarksForStudent(regNumber);
      setState({ status: "loaded", marks, message: "" });
    } catch (error) {
      setState({
        status: "error",
        marks: [],
        message: error.detail || "Couldn't load marks.",
      });
    }
  }, [regNumber]);

  useEffect(() => {
    fetchMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMarks, refreshKey]);

  async function handleDeleteConfirm() {
    setDeletePending(true);
    try {
      await deleteMark(regNumber, deletingMark.id);
      setDeletingMark(null);
      fetchMarks();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        message: error.detail || "Couldn't delete this mark.",
      }));
      setDeletingMark(null);
    } finally {
      setDeletePending(false);
    }
  }

  if (state.status === "loading") {
    return <p className="list-state">Loading marks…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="list-state list-state--error">
        <p>{state.message}</p>
        <button type="button" className="pagination-button" onClick={fetchMarks}>
          Retry
        </button>
      </div>
    );
  }

  if (state.marks.length === 0) {
    return <p className="list-state">No marks recorded yet.</p>;
  }

  return (
    <>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Course</th>
              <th scope="col">Semester</th>
              <th scope="col">Score</th>
              <th scope="col">Grade</th>
              {showActions && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {state.marks.map((mark) => (
              <tr key={mark.id}>
                <td>{courseLookup.get(mark.course_id)?.name ?? `Course #${mark.course_id}`}</td>
                <td>{formatSemester(semesterLookup.get(mark.semester_id))}</td>
                <td>{mark.score}</td>
                <td>{mark.grade}</td>
                {showActions && (
                  <td>
                    <div className="flex items-center gap-1">
                      {canUpdate && (
                        <button
                          type="button"
                          aria-label="Edit this mark"
                          onClick={() => setEditingMark(mark)}
                          className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                        >
                          <IconEdit />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          aria-label="Delete this mark"
                          onClick={() => setDeletingMark(mark)}
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

      {editingMark && (
        <EditMarkModal
          key={editingMark.id}
          mark={editingMark}
          regNumber={regNumber}
          courseOptions={courseOptions}
          semesterOptions={semesterOptions}
          onClose={() => setEditingMark(null)}
          onSaved={() => {
            setEditingMark(null);
            fetchMarks();
          }}
        />
      )}

      {deletingMark && (
        <ConfirmDialog
          title="Delete mark"
          message="Delete this mark? This can't be undone."
          pending={deletePending}
          onCancel={() => setDeletingMark(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}

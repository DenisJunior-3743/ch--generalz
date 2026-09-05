import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCourse, updateCourse, deleteCourse } from "../api/courses";
import { courseSchema, courseDefaultValues } from "../schemas/courseSchema";
import { useCourses } from "../hooks/useCourses";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import TextField from "../components/forms/TextField";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

function EditCourseModal({ course, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: { code: course.code, name: course.name },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateCourse(course.id, values);
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
          message: error.detail || "A course with that code already exists.",
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
    <Modal title="Edit course" onClose={onClose}>
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

export default function CoursesPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "courses", "create");
  const canUpdate = hasPermission(user, "courses", "update");
  const canDelete = hasPermission(user, "courses", "delete");
  const showActions = canUpdate || canDelete;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(courseSchema),
    mode: "onBlur",
    defaultValues: courseDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const { status, courses, message, refetch } = useCourses();

  const [editingCourse, setEditingCourse] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createCourse(values);
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
          message: error.detail || "A course with that code already exists.",
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
      await deleteCourse(deletingCourse.id);
      setBanner({ type: "success", message: `${deletingCourse.name} was deleted.` });
      setDeletingCourse(null);
      refetch();
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this course.",
      });
      setDeletingCourse(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Courses</h1>
        <p>
          Individual course units that carry marks (e.g. CS101) — not the degree,
          that's Programs.
        </p>
      </div>

      {canCreate && (
        <div className="panel">
          <h2>Add course</h2>

          {banner && (
            <p className={`form-banner form-banner--${banner.type}`}>
              {banner.message}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
              <TextField
                label="Code"
                placeholder="e.g. CS101"
                error={errors.code}
                {...register("code")}
              />
              <TextField
                label="Name"
                placeholder="e.g. Intro to Programming"
                error={errors.name}
                {...register("name")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="form-submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add course"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Course list</h2>

        {status === "loading" && <p className="list-state">Loading courses…</p>}

        {status === "error" && (
          <div className="list-state list-state--error">
            <p>{message}</p>
            <button type="button" className="pagination-button" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {status === "loaded" && courses.length === 0 && (
          <p className="list-state">No courses yet — add the first one above.</p>
        )}

        {status === "loaded" && courses.length > 0 && (
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
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.code}</td>
                    <td>{course.name}</td>
                    {showActions && (
                      <td>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              aria-label={`Edit ${course.name}`}
                              onClick={() => setEditingCourse(course)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                            >
                              <IconEdit />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete ${course.name}`}
                              onClick={() => setDeletingCourse(course)}
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

      {editingCourse && (
        <EditCourseModal
          key={editingCourse.id}
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSaved={() => {
            setEditingCourse(null);
            setBanner({ type: "success", message: "Course updated." });
            refetch();
          }}
        />
      )}

      {deletingCourse && (
        <ConfirmDialog
          title="Delete course"
          message={`Delete ${deletingCourse.name} (${deletingCourse.code})? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingCourse(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

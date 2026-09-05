import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateStudent, deleteStudent } from "../api/students";
import { studentUpdateSchema } from "../schemas/studentSchema";
import { useFaculties } from "../hooks/useFaculties";
import { usePrograms } from "../hooks/usePrograms";
import { useStudents } from "../hooks/useStudents";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import { formatRegNumber } from "../utils/format";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

const PAGE_SIZE = 10;

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function EditStudentModal({ student, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentUpdateSchema),
    defaultValues: {
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone_number: student.phone_number,
      gender: student.gender,
      faculty_id: String(student.faculty_id),
      program_id: String(student.program_id),
      intake_year: student.intake_year,
    },
  });
  const [banner, setBanner] = useState(null);

  const { status: facultiesStatus, faculties } = useFaculties();
  const facultyIdValue = watch("faculty_id");
  const { status: programsStatus, programs } = usePrograms(facultyIdValue, {
    enabled: Boolean(facultyIdValue),
  });

  // Only clear the program selection when the user actually changes the
  // faculty away from the student's current one — not on the initial mount,
  // where faculty_id already starts populated from defaultValues.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateStudent(student.reg_number, values);
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
          message: error.detail || "That faculty or program no longer exists.",
        });
      } else if (error.status === 409) {
        setBanner({
          type: "error",
          message: error.detail || "That email is already registered to another student.",
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
    <Modal title={`Edit ${student.first_name} ${student.last_name}`} onClose={onClose}>
      {banner && (
        <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-grid">
          <TextField label="First name" error={errors.first_name} {...register("first_name")} />
          <TextField label="Last name" error={errors.last_name} {...register("last_name")} />
          <TextField label="Email" type="email" error={errors.email} {...register("email")} />
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
            error={errors.intake_year}
            {...register("intake_year")}
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

export default function StudentsPage() {
  const { user } = useAuth();
  const canUpdate = hasPermission(user, "students", "update");
  const canDelete = hasPermission(user, "students", "delete");
  const showActions = canUpdate || canDelete;

  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState(null);

  const { faculties } = useFaculties();
  const { programs } = usePrograms();
  const { status, items, total, message, refetch } = useStudents(page, PAGE_SIZE);

  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const facultyLookup = useMemo(() => {
    const map = new Map();
    faculties.forEach((f) => map.set(f.id, f));
    return map;
  }, [faculties]);

  const programLookup = useMemo(() => {
    const map = new Map();
    programs.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  async function handleDeleteConfirm() {
    setDeletePending(true);
    try {
      await deleteStudent(deletingStudent.reg_number);
      setBanner({
        type: "success",
        message: `${deletingStudent.first_name} ${deletingStudent.last_name} was deleted.`,
      });
      setDeletingStudent(null);
      refetch();
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this student.",
      });
      setDeletingStudent(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Students</h1>
        <p>Every registered student. New students are added via Student Registration.</p>
      </div>

      <div className="panel">
        {banner && (
          <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
        )}

        {status === "loading" && <p className="list-state">Loading students…</p>}

        {status === "error" && (
          <div className="list-state list-state--error">
            <p>{message}</p>
            <button type="button" className="pagination-button" onClick={refetch}>
              Retry
            </button>
          </div>
        )}

        {status === "loaded" && items.length === 0 && (
          <p className="list-state">No students registered yet.</p>
        )}

        {status === "loaded" && items.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Reg number</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Faculty</th>
                    <th scope="col">Program</th>
                    <th scope="col">Intake</th>
                    <th scope="col">Gender</th>
                    {showActions && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((student) => (
                    <tr key={student.reg_number}>
                      <td>{formatRegNumber(student.reg_number)}</td>
                      <td>
                        {student.first_name} {student.last_name}
                      </td>
                      <td>{student.email}</td>
                      <td>
                        {facultyLookup.get(student.faculty_id)?.name ??
                          `Faculty #${student.faculty_id}`}
                      </td>
                      <td>
                        {programLookup.get(student.program_id)?.name ??
                          `Program #${student.program_id}`}
                      </td>
                      <td>{student.intake_year}</td>
                      <td className="capitalize">{student.gender}</td>
                      {showActions && (
                        <td>
                          <div className="flex items-center gap-1">
                            {canUpdate && (
                              <button
                                type="button"
                                aria-label={`Edit ${student.first_name} ${student.last_name}`}
                                onClick={() => setEditingStudent(student)}
                                className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                              >
                                <IconEdit />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                aria-label={`Delete ${student.first_name} ${student.last_name}`}
                                onClick={() => setDeletingStudent(student)}
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
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {editingStudent && (
        <EditStudentModal
          key={editingStudent.reg_number}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            setBanner({ type: "success", message: "Student updated." });
            refetch();
          }}
        />
      )}

      {deletingStudent && (
        <ConfirmDialog
          title="Delete student"
          message={`Delete ${deletingStudent.first_name} ${deletingStudent.last_name} (${formatRegNumber(deletingStudent.reg_number)})? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingStudent(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

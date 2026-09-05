import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStaff, listStaff, updateStaff, deleteStaff } from "../api/staff";
import { staffSchema, staffDefaultValues } from "../schemas/staffSchema";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../auth/permissions";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";
import Pagination from "../components/Pagination";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconEdit, IconTrash } from "../components/icons";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const PAGE_SIZE = 10;

function EditStaffModal({ staff, onClose, onSaved }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      phone_number: staff.phone_number,
      gender: staff.gender,
    },
  });
  const [banner, setBanner] = useState(null);

  async function onSubmit(values) {
    setBanner(null);
    try {
      await updateStaff(staff.id, values);
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
          message: error.detail || "That email is already registered.",
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
    <Modal title="Edit staff member" onClose={onClose}>
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

export default function StaffPage() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "staff", "create");
  const canUpdate = hasPermission(user, "staff", "update");
  const canDelete = hasPermission(user, "staff", "delete");
  const showActions = canUpdate || canDelete;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(staffSchema),
    mode: "onBlur",
    defaultValues: staffDefaultValues,
  });

  const [banner, setBanner] = useState(null);
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ status: "loading", items: [], total: 0 });

  const [editingStaff, setEditingStaff] = useState(null);
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const fetchStaff = useCallback(async (targetPage) => {
    setList((prev) => ({ ...prev, status: "loading" }));
    try {
      const data = await listStaff({ page: targetPage, pageSize: PAGE_SIZE });
      setList({ status: "loaded", items: data.items, total: data.total });
    } catch (error) {
      setList({
        status: "error",
        items: [],
        total: 0,
        message: error.detail || "Couldn't load the staff directory.",
      });
    }
  }, []);

  useEffect(() => {
    fetchStaff(page);
  }, [page, fetchStaff]);

  async function onSubmit(values) {
    setBanner(null);
    try {
      const created = await createStaff(values);
      setBanner({
        type: "success",
        message: `${created.first_name} ${created.last_name} was registered successfully.`,
      });
      reset();
      setPage(1);
      fetchStaff(1);
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
          message: error.detail || "That email is already registered.",
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
      await deleteStaff(deletingStaff.id);
      setBanner({
        type: "success",
        message: `${deletingStaff.first_name} ${deletingStaff.last_name} was deleted.`,
      });
      setDeletingStaff(null);
      fetchStaff(page);
    } catch (error) {
      setBanner({
        type: "error",
        message: error.detail || "Couldn't delete this staff member.",
      });
      setDeletingStaff(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Staff</h1>
        <p>Register a new staff member and browse the staff directory.</p>
      </div>

      {canCreate && (
        <div className="panel">
          <h2>Register staff</h2>

          {banner && (
            <p className={`form-banner form-banner--${banner.type}`}>
              {banner.message}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-grid">
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
              <button type="submit" className="form-submit" disabled={isSubmitting}>
                {isSubmitting ? "Registering…" : "Register staff"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <h2>Staff directory</h2>

        {list.status === "loading" && (
          <p className="list-state">Loading staff…</p>
        )}

        {list.status === "error" && (
          <div className="list-state list-state--error">
            <p>{list.message}</p>
            <button
              type="button"
              className="pagination-button"
              onClick={() => fetchStaff(page)}
            >
              Retry
            </button>
          </div>
        )}

        {list.status === "loaded" && list.items.length === 0 && (
          <p className="list-state">No staff registered yet.</p>
        )}

        {list.status === "loaded" && list.items.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Gender</th>
                    {showActions && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        {staff.first_name} {staff.last_name}
                      </td>
                      <td>{staff.email}</td>
                      <td>{staff.phone_number}</td>
                      <td className="capitalize">{staff.gender}</td>
                      {showActions && (
                        <td>
                          <div className="flex items-center gap-1">
                            {canUpdate && (
                              <button
                                type="button"
                                aria-label={`Edit ${staff.first_name} ${staff.last_name}`}
                                onClick={() => setEditingStaff(staff)}
                                className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-4 [&>svg]:w-4"
                              >
                                <IconEdit />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                aria-label={`Delete ${staff.first_name} ${staff.last_name}`}
                                onClick={() => setDeletingStaff(staff)}
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
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={list.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {editingStaff && (
        <EditStaffModal
          key={editingStaff.id}
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => {
            setEditingStaff(null);
            setBanner({ type: "success", message: "Staff member updated." });
            fetchStaff(page);
          }}
        />
      )}

      {deletingStaff && (
        <ConfirmDialog
          title="Delete staff member"
          message={`Delete ${deletingStaff.first_name} ${deletingStaff.last_name}? This can't be undone.`}
          pending={deletePending}
          onCancel={() => setDeletingStaff(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

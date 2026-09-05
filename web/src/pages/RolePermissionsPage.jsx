import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPermission, listPermissions } from "../api/permissions";
import {
  grantRolePermission,
  listRolePermissions,
  revokeRolePermission,
} from "../api/rolePermissions";
import TextField from "../components/forms/TextField";
import SelectField from "../components/forms/SelectField";

const ROLES = ["admin", "staff", "student"];
const ACTIONS = ["create", "read", "update", "delete"];

const permissionSchema = z.object({
  module: z.string().min(1, "Module is required"),
  action: z.enum(ACTIONS, { message: "Select an action" }),
});

export default function RolePermissionsPage() {
  const [state, setState] = useState({
    status: "loading",
    permissions: [],
    grants: [],
    message: "",
  });
  const [banner, setBanner] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);

  const fetchAll = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const [permissions, grants] = await Promise.all([
        listPermissions(),
        listRolePermissions(),
      ]);
      setState({ status: "loaded", permissions, grants, message: "" });
    } catch (error) {
      setState({
        status: "error",
        permissions: [],
        grants: [],
        message: error.detail || "Couldn't load permissions.",
      });
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(permissionSchema),
    mode: "onBlur",
    defaultValues: { module: "", action: "" },
  });

  async function onCreatePermission(values) {
    setBanner(null);
    try {
      await createPermission(values);
      setBanner({
        type: "success",
        message: `Permission "${values.module}:${values.action}" was created.`,
      });
      reset();
      fetchAll();
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
          message: error.detail || "That module/action pair already exists.",
        });
      } else {
        setBanner({
          type: "error",
          message: error.detail || "Something went wrong. Please try again.",
        });
      }
    }
  }

  const modules = useMemo(() => {
    const byModule = new Map();
    state.permissions.forEach((p) => {
      if (!byModule.has(p.module)) byModule.set(p.module, []);
      byModule.get(p.module).push(p);
    });
    return [...byModule.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([moduleName, perms]) => [
        moduleName,
        [...perms].sort((a, b) => a.action.localeCompare(b.action)),
      ]);
  }, [state.permissions]);

  function findGrant(role, permissionId) {
    return state.grants.find((g) => g.role === role && g.permission_id === permissionId);
  }

  async function toggleGrant(role, permission) {
    const key = `${role}:${permission.id}`;
    setPendingKey(key);
    setBanner(null);
    const existing = findGrant(role, permission.id);
    try {
      if (existing) {
        await revokeRolePermission(existing.id);
      } else {
        await grantRolePermission(role, permission.id);
      }
      await fetchAll();
    } catch (error) {
      setBanner({ type: "error", message: error.detail || "Couldn't update that grant." });
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Roles &amp; Permissions</h1>
        <p>
          Grant or revoke a permission for a role — takes effect immediately, no
          re-login needed. There's no "create a role" here — only the three
          built-in roles (admin, staff, student) exist to grant against.
        </p>
      </div>

      <div className="panel">
        <h2>Define a new permission</h2>
        <p className="-mt-2 mb-4 text-xs text-muted-foreground">
          Rarely needed — the standard module/action pairs already exist. Use this
          only for a module this list doesn't have yet.
        </p>

        {banner && (
          <p className={`form-banner form-banner--${banner.type}`}>{banner.message}</p>
        )}

        <form onSubmit={handleSubmit(onCreatePermission)} noValidate>
          <div className="form-grid">
            <TextField
              label="Module"
              placeholder="e.g. library"
              error={errors.module}
              {...register("module")}
            />
            <SelectField
              label="Action"
              options={ACTIONS.map((a) => ({ value: a, label: a }))}
              error={errors.action}
              {...register("action")}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="form-submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add permission"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Grant matrix</h2>

        {state.status === "loading" && <p className="list-state">Loading permissions…</p>}

        {state.status === "error" && (
          <div className="list-state list-state--error">
            <p>{state.message}</p>
            <button type="button" className="pagination-button" onClick={fetchAll}>
              Retry
            </button>
          </div>
        )}

        {state.status === "loaded" && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Module</th>
                  <th scope="col">Action</th>
                  {ROLES.map((role) => (
                    <th key={role} scope="col" className="capitalize">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map(([moduleName, perms]) =>
                  perms.map((permission, index) => (
                    <tr key={permission.id}>
                      {index === 0 && (
                        <td
                          rowSpan={perms.length}
                          className="border-r border-border align-middle font-semibold capitalize"
                        >
                          {moduleName}
                        </td>
                      )}
                      <td>{permission.action}</td>
                      {ROLES.map((role) => {
                        const granted = Boolean(findGrant(role, permission.id));
                        const key = `${role}:${permission.id}`;
                        return (
                          <td key={role} className="text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-navy"
                              checked={granted}
                              disabled={pendingKey === key}
                              onChange={() => toggleGrant(role, permission)}
                              aria-label={`${role} ${moduleName}:${permission.action}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

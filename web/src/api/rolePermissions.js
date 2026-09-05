import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function grantRolePermission(role, permissionId) {
  try {
    const { data } = await apiClient.post("/role-permissions", {
      role,
      permission_id: permissionId,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listRolePermissions() {
  try {
    const { data } = await apiClient.get("/role-permissions");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function revokeRolePermission(grantId) {
  try {
    await apiClient.delete(`/role-permissions/${grantId}`);
  } catch (error) {
    throw toApiError(error);
  }
}

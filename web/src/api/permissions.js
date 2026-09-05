import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createPermission(payload) {
  try {
    const { data } = await apiClient.post("/permissions", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listPermissions() {
  try {
    const { data } = await apiClient.get("/permissions");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

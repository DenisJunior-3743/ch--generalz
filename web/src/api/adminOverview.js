import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function getAdminOverview() {
  try {
    const { data } = await apiClient.get("/admin/overview");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

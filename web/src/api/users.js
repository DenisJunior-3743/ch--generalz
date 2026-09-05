import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createUser(payload) {
  try {
    const { data } = await apiClient.post("/users", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

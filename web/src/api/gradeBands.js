import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createGradeBand(payload) {
  try {
    const { data } = await apiClient.post("/grade-bands", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listGradeBands() {
  try {
    const { data } = await apiClient.get("/grade-bands");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateGradeBand(id, payload) {
  try {
    const { data } = await apiClient.put(`/grade-bands/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteGradeBand(id) {
  try {
    await apiClient.delete(`/grade-bands/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}

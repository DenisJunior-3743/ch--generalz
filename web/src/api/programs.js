import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createProgram(payload) {
  try {
    const { data } = await apiClient.post("/programs", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listPrograms({ facultyId } = {}) {
  try {
    const { data } = await apiClient.get("/programs", {
      params: facultyId ? { faculty_id: facultyId } : undefined,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateProgram(id, payload) {
  try {
    const { data } = await apiClient.put(`/programs/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteProgram(id) {
  try {
    await apiClient.delete(`/programs/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}

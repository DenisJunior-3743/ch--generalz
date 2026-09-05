import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createSemester(payload) {
  try {
    const { data } = await apiClient.post("/semesters", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listSemesters() {
  try {
    const { data } = await apiClient.get("/semesters");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateSemester(id, payload) {
  try {
    const { data } = await apiClient.put(`/semesters/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteSemester(id) {
  try {
    await apiClient.delete(`/semesters/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}

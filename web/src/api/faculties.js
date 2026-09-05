import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createFaculty(payload) {
  try {
    const { data } = await apiClient.post("/faculties", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listFaculties() {
  try {
    const { data } = await apiClient.get("/faculties");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateFaculty(id, payload) {
  try {
    const { data } = await apiClient.put(`/faculties/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteFaculty(id) {
  try {
    await apiClient.delete(`/faculties/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}

import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function submitMarks(regNumber, marks) {
  try {
    const { data } = await apiClient.post(`/students/${regNumber}/marks`, { marks });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listMarksForStudent(regNumber) {
  try {
    const { data } = await apiClient.get(`/students/${regNumber}/marks`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateMark(regNumber, markId, payload) {
  try {
    const { data } = await apiClient.put(`/students/${regNumber}/marks/${markId}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteMark(regNumber, markId) {
  try {
    await apiClient.delete(`/students/${regNumber}/marks/${markId}`);
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Student-only, own marks. Structurally has no `score` field — never
 * "hidden client-side," genuinely absent from the response. See the
 * visibility-rule note in API_REFERENCE.md's marks section.
 */
export async function getMyMarks() {
  try {
    const { data } = await apiClient.get("/me/marks");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

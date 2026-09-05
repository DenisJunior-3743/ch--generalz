import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createCourse(payload) {
  try {
    const { data } = await apiClient.post("/courses", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listCourses() {
  try {
    const { data } = await apiClient.get("/courses");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateCourse(id, payload) {
  try {
    const { data } = await apiClient.put(`/courses/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteCourse(id) {
  try {
    await apiClient.delete(`/courses/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}

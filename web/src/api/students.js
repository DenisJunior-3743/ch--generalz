import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createStudent(payload) {
  try {
    const { data } = await apiClient.post("/students", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listStudents({ page = 1, pageSize = 10 } = {}) {
  try {
    const { data } = await apiClient.get("/students", {
      params: { page, page_size: pageSize },
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getStudentByRegNumber(regNumber) {
  try {
    const { data } = await apiClient.get(`/students/${regNumber}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateStudent(regNumber, payload) {
  try {
    const { data } = await apiClient.put(`/students/${regNumber}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteStudent(regNumber) {
  try {
    await apiClient.delete(`/students/${regNumber}`);
  } catch (error) {
    throw toApiError(error);
  }
}

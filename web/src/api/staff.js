import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function createStaff(payload) {
  try {
    const { data } = await apiClient.post("/staff", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function listStaff({ page = 1, pageSize = 10 } = {}) {
  try {
    const { data } = await apiClient.get("/staff", {
      params: { page, page_size: pageSize },
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getStaffById(id) {
  try {
    const { data } = await apiClient.get(`/staff/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updateStaff(id, payload) {
  try {
    const { data } = await apiClient.put(`/staff/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteStaff(id) {
  try {
    await apiClient.delete(`/staff/${id}`);
  } catch (error) {
    throw toApiError(error);
  }
}

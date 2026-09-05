import { apiClient } from "./client";
import { toApiError } from "./errors";

export async function login(username, password) {
  try {
    const { data } = await apiClient.post("/auth/login", { username, password });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function getMe() {
  try {
    const { data } = await apiClient.get("/auth/me");
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * A student who already has a registered profile (created by staff via
 * POST /students) sets up their own login. No auth required. The response
 * is a valid TokenOut (same shape as login) but we deliberately don't use
 * it to auto-authenticate — see RegisterPage.jsx.
 */
export async function registerStudent(payload) {
  try {
    const { data } = await apiClient.post("/auth/register/student", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Same idea for a staff member, proving ownership via their registered
 * email instead of a reg_number.
 */
export async function registerStaff(payload) {
  try {
    const { data } = await apiClient.post("/auth/register/staff", payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

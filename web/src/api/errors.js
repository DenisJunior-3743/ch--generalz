export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

export function toApiError(error) {
  if (error.response) {
    return new ApiError(error.response.status, error.response.data?.detail);
  }
  if (error.code === "ECONNABORTED") {
    return new ApiError(0, "Request timed out — the server took too long to respond.");
  }
  return new ApiError(0, "Network error — is the backend running?");
}

/**
 * `error.detail` is a string for 404/409 but an *array* of {msg, loc, ...}
 * issues for 422 — rendering it directly as a banner/child crashes React
 * ("Objects are not valid as a React child") wherever there's no per-field
 * form to route 422s to instead. Use this anywhere a raw `error.detail` is
 * about to be displayed as plain text, not just matched in an `if
 * (Array.isArray(...))` branch.
 */
export function getErrorMessage(error, fallback) {
  if (Array.isArray(error?.detail)) {
    return error.detail.map((issue) => issue.msg).filter(Boolean).join(" ") || fallback;
  }
  return error?.detail || fallback;
}

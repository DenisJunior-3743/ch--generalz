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

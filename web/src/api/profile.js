import { apiClient } from "./client";
import { toApiError } from "./errors";

/**
 * FormData as the body, not JSON — axios detects it and lets the browser
 * set the multipart Content-Type (with boundary) itself, overriding the
 * apiClient instance's default "application/json" header.
 *
 * `file` may be a File (from a raw <input type="file">) or a plain Blob
 * (the cropped output from PhotoCropModal's canvas) — a Blob has no
 * `.name`, so fall back to a fixed filename for it.
 */
export async function uploadMyPhoto(file) {
  try {
    const form = new FormData();
    form.append("file", file, file.name || "profile.jpg");
    const { data } = await apiClient.put("/me/photo", form);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deleteMyPhoto() {
  try {
    await apiClient.delete("/me/photo");
  } catch (error) {
    throw toApiError(error);
  }
}

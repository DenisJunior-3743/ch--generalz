import { apiClient } from "./client";
import { toApiError } from "./errors";

/**
 * FormData as the body, not JSON. apiClient sets a default
 * "Content-Type: application/json" header on every request — axios is
 * *supposed* to detect FormData and let the browser set its own
 * multipart Content-Type (with boundary) instead, but that detection
 * doesn't reliably override an explicitly pre-set default header, so the
 * request can go out as "application/json" with a FormData body, which
 * the backend then sees as having no `file` field at all. Explicitly
 * clearing Content-Type for this one call is the standard fix — it lets
 * the browser set the correct multipart header unconditionally.
 *
 * `file` may be a File (from a raw <input type="file">) or a plain Blob
 * (the cropped output from PhotoCropModal's canvas) — a Blob has no
 * `.name`, so fall back to a fixed filename for it.
 */
export async function uploadMyPhoto(file) {
  try {
    const form = new FormData();
    form.append("file", file, file.name || "profile.jpg");
    const { data } = await apiClient.put("/me/photo", form, {
      headers: { "Content-Type": undefined },
    });
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

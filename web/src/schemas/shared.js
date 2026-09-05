import { z } from "zod";

/**
 * A required 0–100 score-like field. z.coerce.number().min(0) alone would
 * NOT reject an empty input — Number("") is 0, which passes min(0). This
 * treats "" as genuinely missing first, so it fails as "required" instead
 * of silently coercing to a zero score.
 */
export function requiredScore(message = "Enter a score") {
  return z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number({ message }).min(0, "Must be 0–100").max(100, "Must be 0–100"),
  );
}

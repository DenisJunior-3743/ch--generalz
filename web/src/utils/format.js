/**
 * Reg numbers are stored dash-separated (e.g. "2023-bse-164-PS") because a
 * literal "/" breaks routing (GET /students/{reg_number}) — see
 * docs/API_REFERENCE.md. Dashes display fine, but slashes read better, so
 * this is display-only: never send the slash version back to the API.
 */
export function formatRegNumber(regNumber) {
  if (!regNumber) return regNumber;
  return regNumber.replaceAll("-", "/");
}

/**
 * Inverse of formatRegNumber. Students type their reg number the way it
 * appears on their documents (slash-separated), but the API stores and
 * expects dashes — normalize before sending it anywhere near the API.
 */
export function parseRegNumber(regNumber) {
  if (!regNumber) return regNumber;
  return regNumber.trim().replaceAll("/", "-");
}

const TERM_LABELS = {
  sem_1: "Semester 1",
  sem_2: "Semester 2",
};

export function formatTerm(term) {
  return TERM_LABELS[term] ?? term;
}

export function formatSemester(semester) {
  if (!semester) return "";
  return `${semester.academic_year} — ${formatTerm(semester.term)}`;
}

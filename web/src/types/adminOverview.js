/**
 * The bundled admin dashboard response — every row of every entity, in
 * one request. No pagination, so this won't stay cheap forever at scale,
 * but it's what the dashboard reads today.
 *
 * @typedef {Object} AdminOverview
 * @property {import("./staff").Staff[]} staff
 * @property {import("./faculty").Faculty[]} faculties
 * @property {import("./program").Program[]} programs
 * @property {import("./course").Course[]} courses
 * @property {import("./semester").Semester[]} semesters
 * @property {import("./gradeBand").GradeBand[]} grade_bands
 * @property {import("./student").Student[]} students
 * @property {import("./mark").Mark[]} marks
 */

export {};

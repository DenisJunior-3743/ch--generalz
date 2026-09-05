/**
 * A login account — distinct from Staff/Student, which are the people
 * records. One account can link to at most one Staff or Student (never
 * both), depending on role.
 *
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {"admin"|"staff"|"student"} role
 * @property {number|null} staff_id
 * @property {string|null} student_reg_number
 */

export {};

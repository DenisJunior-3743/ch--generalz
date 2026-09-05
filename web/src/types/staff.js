/**
 * @typedef {Object} Staff
 * @property {number} id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} phone_number
 * @property {"male"|"female"|"other"} gender
 */

/**
 * @typedef {Object} StaffCreateInput
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} phone_number
 * @property {"male"|"female"|"other"} gender
 */

/**
 * @typedef {Object} PaginatedStaff
 * @property {Staff[]} items
 * @property {number} total
 * @property {number} page
 * @property {number} page_size
 */

export {};

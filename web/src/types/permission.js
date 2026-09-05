/**
 * @typedef {Object} Permission
 * @property {number} id
 * @property {string} module
 * @property {"create"|"read"|"update"|"delete"} action
 */

/**
 * A grant of one Permission to one of the three fixed roles. There is no
 * "create a new role" endpoint — role is always "admin" | "staff" | "student".
 *
 * @typedef {Object} RolePermission
 * @property {number} id
 * @property {"admin"|"staff"|"student"} role
 * @property {number} permission_id
 */

export {};

/**
 * The admin-configured scoring scale — the backend looks up a mark's
 * letter grade from this table. Never shown to staff as a selector; never
 * hardcode this mapping in the frontend, always fetch it.
 *
 * @typedef {Object} GradeBand
 * @property {number} id
 * @property {number} min_score
 * @property {number} max_score
 * @property {"A"|"B+"|"B"|"C+"|"C"|"D+"|"D"|"F"} grade
 */

export {};

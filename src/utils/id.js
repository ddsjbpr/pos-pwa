
// File: src/utils/id.js

export function genId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

/**
 * storage-migration.js — InkForge rename (v1.21.0): one-time localStorage
 * migration. Copies every legacy 'inkflow*' key to its 'inkforge*' equivalent
 * and removes the old key, so existing users keep all saved data across the
 * rename. Self-executes on import; MUST be the first import in index.js so
 * the migration runs before any module reads its storage keys.
 *
 * Rules:
 *  - only keys starting with inkflow- / inkflow_ are migrated;
 *  - a legacy key is copied only when the new key is absent (newer data wins);
 *  - the legacy key is removed either way, which makes the pass idempotent.
 */
(function migrateLegacyStorageKeys() {
  if (typeof localStorage === 'undefined') return;
  const legacyKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (/^inkflow[-_]/i.test(key)) legacyKeys.push(key);
  }
  legacyKeys.forEach((key) => {
    const newKey = 'inkforge' + key.slice('inkflow'.length);
    if (localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, localStorage.getItem(key));
    }
    localStorage.removeItem(key);
  });
})();

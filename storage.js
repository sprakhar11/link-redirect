/**
 * Storage layer for Chrome Link Redirect extension.
 * Provides read/write access to redirect rules via chrome.storage.sync.
 */

const STORAGE_KEY = "rules";

/**
 * Get all redirect rules from Chrome sync storage.
 * @returns {Promise<RedirectRule[]>} Array of redirect rules, or empty array if none exist.
 */
function getRules() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/**
 * Save all redirect rules to Chrome sync storage.
 * @param {RedirectRule[]} rules - The array of redirect rules to persist.
 * @returns {Promise<void>}
 */
function setRules(rules) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: rules }, () => {
      resolve();
    });
  });
}

/**
 * Listen for external storage changes to the rules key.
 * @param {(rules: RedirectRule[]) => void} callback - Called with the updated rules array.
 */
function onRulesChanged(callback) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes[STORAGE_KEY]) {
      callback(changes[STORAGE_KEY].newValue || []);
    }
  });
}

// Export for testing (Node.js environment only)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getRules, setRules, onRulesChanged, STORAGE_KEY };
}

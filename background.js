/**
 * Background service worker for Chrome Link Redirect extension.
 * Intercepts navigation events and redirects URLs based on user-defined regex rules.
 */

importScripts("storage.js");

/** @type {RedirectRule[]} */
let rules = [];

/** @type {Map<number, { count: number, firstRedirectTime: number }>} */
const redirectTracker = new Map();

/**
 * Initialize: load rules from storage and set up listeners.
 * @returns {Promise<void>}
 */
async function init() {
  rules = await getRules();

  chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);
  chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

  onRulesChanged((updatedRules) => {
    rules = updatedRules;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    redirectTracker.delete(tabId);
  });
}

/**
 * Handle a navigation event, apply matching rules.
 * @param {object} details - WebNavigation event details.
 */
function handleNavigation(details) {
  if (details.frameId !== 0) {
    return;
  }

  const matchingRule = findMatchingRule(details.url, rules);
  if (!matchingRule) {
    return;
  }

  if (!checkRedirectLoop(details.tabId, details.url)) {
    return;
  }

  const pattern = matchingRule.mode === "ilike"
    ? ilikeToRegex(matchingRule.pattern)
    : new RegExp(matchingRule.pattern);
  let newUrl = applySubstitution(details.url, pattern, matchingRule.destination);

  // Auto-prepend https:// if the destination has no protocol scheme
  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(newUrl)) {
    newUrl = "https://" + newUrl;
  }

  chrome.tabs.update(details.tabId, { url: newUrl });
}

/**
 * Convert an ILIKE pattern to a RegExp.
 * % = any characters (.*), _ = single character (.)
 * Matching is case-insensitive.
 * @param {string} pattern - ILIKE pattern string.
 * @returns {RegExp} Compiled regex.
 */
function ilikeToRegex(pattern) {
  // Normalize * to % so users can use either wildcard style
  const normalized = pattern.replace(/\*/g, "%");
  const escaped = normalized.replace(/([.+?^${}()|[\]\\])/g, "\\$1");
  const regexStr = "^" + escaped.replace(/%/g, "(.*)").replace(/_/g, "(.)") + "$";
  return new RegExp(regexStr, "i");
}

/**
 * Find the first matching enabled rule for a URL.
 * @param {string} url - The URL to match against.
 * @param {RedirectRule[]} ruleList - The rules to evaluate.
 * @returns {RedirectRule|null} The first matching rule, or null.
 */
function findMatchingRule(url, ruleList) {
  for (const rule of ruleList) {
    if (!rule.enabled) {
      continue;
    }

    // Empty pattern means "match new tab"
    if (!rule.pattern || rule.pattern.trim() === "") {
      if (url === "chrome://newtab/" || url === "chrome://new-tab-page/") {
        return rule;
      }
      continue;
    }

    let regex;
    try {
      if (rule.mode === "ilike") {
        regex = ilikeToRegex(rule.pattern);
      } else {
        regex = new RegExp(rule.pattern);
      }
    } catch (e) {
      console.warn(
        `Skipping rule "${rule.id}": invalid pattern "${rule.pattern}" — ${e.message}`
      );
      continue;
    }

    if (regex.test(url)) {
      return rule;
    }
  }

  return null;
}

/**
 * Apply capture group substitution to a destination URL.
 * @param {string} url - The original URL.
 * @param {RegExp} pattern - The compiled regex pattern.
 * @param {string} destination - The destination URL with $1, $2, etc. placeholders.
 * @returns {string} The destination URL with placeholders replaced.
 */
function applySubstitution(url, pattern, destination) {
  const match = pattern.exec(url);
  if (!match) {
    return destination;
  }

  return destination.replace(/\$(\d+)/g, (placeholder, groupIndex) => {
    const index = parseInt(groupIndex, 10);
    return index < match.length ? match[index] : placeholder;
  });
}

/**
 * Check if a redirect would cause a loop. Returns true if safe to redirect.
 * @param {number} tabId - The tab ID.
 * @param {string} url - The target redirect URL.
 * @returns {boolean} True if safe to redirect, false if loop detected.
 */
function checkRedirectLoop(tabId, url) {
  const now = Date.now();
  const entry = redirectTracker.get(tabId);

  if (!entry || now - entry.firstRedirectTime > 10000) {
    redirectTracker.set(tabId, { count: 1, firstRedirectTime: now });
    return true;
  }

  entry.count++;

  if (entry.count > 5) {
    const matchingRule = findMatchingRule(url, rules);
    const ruleId = matchingRule ? matchingRule.id : "unknown";
    console.warn(
      `Redirect loop detected on tab ${tabId}: exceeded 5 redirects in 10s (rule: ${ruleId})`
    );
    return false;
  }

  return true;
}

/**
 * Reset redirect tracking for a tab.
 * @param {number} tabId - The tab ID.
 */
function resetRedirectTracker(tabId) {
  redirectTracker.delete(tabId);
}

/**
 * Get the current in-memory rules (for testing).
 * @returns {RedirectRule[]}
 */
function _getRulesRef() {
  return rules;
}

/**
 * Set the in-memory rules directly (for testing).
 * @param {RedirectRule[]} val
 */
function _setRulesRef(val) {
  rules = val;
}

// Export for testing (Node.js environment only)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    init,
    handleNavigation,
    findMatchingRule,
    applySubstitution,
    ilikeToRegex,
    checkRedirectLoop,
    resetRedirectTracker,
    redirectTracker,
    _getRulesRef,
    _setRulesRef,
  };
}

// Start the service worker
init();

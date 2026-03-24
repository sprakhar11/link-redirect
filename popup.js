/**
 * Popup UI logic for Chrome Link Redirect extension.
 * Manages rule CRUD operations, rendering, and auto-save with debounce.
 */

/** @type {RedirectRule[]} In-memory copy of rules */
let rules = [];

/** @type {Map<string, number>} Debounce timers keyed by rule ID */
const debounceTimers = new Map();

const DEBOUNCE_DELAY = 300;

// --- Placeholder Validation (fully implemented in task 5.4) ---

/**
 * Validate a regex pattern string.
 * @param {string} pattern
 * @returns {string|null} Error message or null if valid.
 */
function validatePattern(pattern) {
  // Empty pattern is valid — it means "match new tab"
  if (!pattern || pattern.trim() === "") {
    return null;
  }
  try {
    new RegExp(pattern);
    return null;
  } catch (e) {
    return e.message;
  }
}

/**
 * Validate a destination URL string.
 * @param {string} destination
 * @returns {string|null} Error message or null if valid.
 */
function validateDestination(destination) {
  if (!destination || destination.trim() === "") {
    return "Destination URL is required";
  }
  return null;
}

// --- Core Functions ---

/**
 * Load rules from storage and render the rule list.
 */
async function loadRules() {
  rules = await getRules();
  renderRules();
}

/**
 * Add a new empty rule, save to storage, and render.
 */
async function addRule() {
  const newRule = {
    id: crypto.randomUUID(),
    pattern: "",
    destination: "",
    enabled: true,
  };
  rules.push(newRule);
  await setRules(rules);
  renderRules();
}

/**
 * Delete a rule by ID, save to storage, and update UI.
 * @param {string} ruleId
 */
async function deleteRule(ruleId) {
  rules = rules.filter((r) => r.id !== ruleId);
  await setRules(rules);
  renderRules();
}

/**
 * Toggle a rule's enabled state, save to storage, and update UI.
 * @param {string} ruleId
 * @param {boolean} enabled
 */
async function toggleRule(ruleId, enabled) {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;
  rule.enabled = enabled;
  await setRules(rules);
  // Update the visual state without full re-render
  const container = document.getElementById("rules-container");
  const entry = container.querySelector(
    `.rule-entry[data-rule-id="${ruleId}"]`
  );
  if (entry) {
    entry.classList.toggle("disabled", !enabled);
  }
}

/**
 * Save rules to storage (called by debounced input handler).
 */
async function saveRules() {
  await setRules(rules);
}

/**
 * Debounced handler for pattern/destination input changes.
 * Updates the in-memory rule and schedules a save.
 * @param {string} ruleId
 * @param {string} field - "pattern" or "destination"
 * @param {string} value
 */
function onFieldInput(ruleId, field, value) {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;
  rule[field] = value;

  // Display inline validation errors
  const container = document.getElementById("rules-container");
  const entry = container
    ? container.querySelector(`.rule-entry[data-rule-id="${ruleId}"]`)
    : null;

  if (entry) {
    if (field === "pattern") {
      const errorSpan = entry.querySelector(".pattern-error");
      const error = validatePattern(value);
      if (errorSpan) errorSpan.textContent = error || "";
    } else if (field === "destination") {
      const errorSpan = entry.querySelector(".destination-error");
      const error = validateDestination(value);
      if (errorSpan) errorSpan.textContent = error || "";
    }
  }

  // Check both fields — skip save if either has validation errors
  const patternError = validatePattern(rule.pattern);
  const destinationError = validateDestination(rule.destination);
  if (patternError || destinationError) {
    // Clear any pending save timer since we won't save
    if (debounceTimers.has(ruleId)) {
      clearTimeout(debounceTimers.get(ruleId));
      debounceTimers.delete(ruleId);
    }
    return;
  }

  // Clear existing timer for this rule
  if (debounceTimers.has(ruleId)) {
    clearTimeout(debounceTimers.get(ruleId));
  }

  // Schedule save
  const timer = setTimeout(() => {
    debounceTimers.delete(ruleId);
    saveRules();
  }, DEBOUNCE_DELAY);
  debounceTimers.set(ruleId, timer);
}

// --- Rendering ---

/**
 * Render all rules into the container by cloning the template.
 */
function renderRules() {
  const container = document.getElementById("rules-container");
  const template = document.getElementById("rule-template");
  container.innerHTML = "";

  for (const rule of rules) {
    const fragment = template.content.cloneNode(true);
    const entry = fragment.querySelector(".rule-entry");

    entry.dataset.ruleId = rule.id;
    if (!rule.enabled) {
      entry.classList.add("disabled");
    }

    const patternInput = entry.querySelector(".rule-pattern");
    patternInput.value = rule.pattern;
    patternInput.addEventListener("input", (e) => {
      onFieldInput(rule.id, "pattern", e.target.value);
    });

    const destInput = entry.querySelector(".rule-destination");
    destInput.value = rule.destination;
    destInput.addEventListener("input", (e) => {
      onFieldInput(rule.id, "destination", e.target.value);
    });

    const toggle = entry.querySelector(".rule-toggle");
    toggle.checked = rule.enabled;
    toggle.addEventListener("change", (e) => {
      toggleRule(rule.id, e.target.checked);
    });

    const deleteBtn = entry.querySelector(".delete-rule-btn");
    deleteBtn.addEventListener("click", () => {
      deleteRule(rule.id);
    });

    container.appendChild(fragment);
  }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-rule-btn").addEventListener("click", addRule);
  loadRules();
});

// Export for testing (Node.js environment only)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadRules,
    addRule,
    deleteRule,
    toggleRule,
    saveRules,
    onFieldInput,
    renderRules,
    validatePattern,
    validateDestination,
    DEBOUNCE_DELAY,
  };
}

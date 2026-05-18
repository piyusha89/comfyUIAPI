import fs from "fs-extra";
import { setProperty as dotPropSet } from "dot-prop";
import { CONFIG, WORKFLOW_PATHS } from "./config.js";

/**
 * Load workflow JSON from file
 */
export async function loadWorkflow(filePath) {
  console.log(`📂 Loading workflow from ${filePath}...`);
  const workflowData = await fs.readJson(filePath);
  console.log("✅ Workflow loaded");
  return workflowData;
}

/**
 * Apply parameter overrides to workflow data
 */
export function applyWorkflowOverrides(workflowData, overrides = {}) {
  console.log("⚙️  Applying workflow overrides...");

  const mappings = [
    { key: "text", path: WORKFLOW_PATHS.text },
    { key: "width", path: WORKFLOW_PATHS.width },
    { key: "height", path: WORKFLOW_PATHS.height },
    { key: "batch_size", path: WORKFLOW_PATHS.batch_size },
  ];

  mappings.forEach(({ key, path }) => {
    if (key in overrides && overrides[key] != null) {
      const value = overrides[key];
      dotPropSet(workflowData, path, value);
      console.log(`  • ${key}: ${value}`);
    }
  });

  console.log("✅ Overrides applied");
  return workflowData;
}

/**
 * Load and process workflow with overrides
 */
export async function prepareWorkflow(overrides = {}) {
  const workflowPath = new URL(CONFIG.WORKFLOW_FILE, import.meta.url);
  let workflowData = await loadWorkflow(workflowPath.pathname);
  workflowData = applyWorkflowOverrides(workflowData, overrides);
  return workflowData;
}

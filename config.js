// Configuration constants for ComfyUI API
export const CONFIG = {
  API_HOST: "127.0.0.1:8188",
  CONNECT_TIMEOUT_MS: 60000,
  POLLING_INTERVAL_MS: 1000,
  WORKFLOW_FILE: "./image_z_image_turbo.json",
};

// Default workflow parameter overrides
export const DEFAULT_OVERRIDES = {
  text: "Child deeply focused painting with fingers, concentration visible",
  width: 1088,
  height: 1360,
  batch_size: 1,
};

// Workflow node paths for parameter mapping
export const WORKFLOW_PATHS = {
  text: "57:27.inputs.text",
  width: "57:13.inputs.width",
  height: "57:13.inputs.height",
  batch_size: "57:13.inputs.batch_size",
};

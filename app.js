import { client, connectClient } from "./client.js";
import { prepareWorkflow } from "./workflow.js";
import { setupEventListeners } from "./events.js";
import { CONFIG, DEFAULT_OVERRIDES } from "./config.js";
import { getOutputDir, saveGeneratedImages } from "./output.js";

/**
 * Execute workflow with ComfyUI
 */
async function runWorkflow(workflowData) {
  // Connect to ComfyUI
  await connectClient();

  // Setup event listeners
  setupEventListeners(client);

  // Enqueue workflow
  console.log("\n📤 Enqueueing workflow...");
  const promptResponse = await client.enqueue(workflowData);
  console.log(`✅ Workflow enqueued with ID: ${promptResponse.prompt_id}\n`);

  const outputDir = getOutputDir();
  await saveGeneratedImages(promptResponse.images, outputDir);
}

/**
 * Main entry point
 */
async function main() {
  console.log("🚀 ImageGen - ComfyUI Workflow Executor\n");

  try {
    // Prepare workflow with parameter overrides
    const workflowData = await prepareWorkflow(DEFAULT_OVERRIDES);

    // Run the workflow
    await runWorkflow(workflowData);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Execute main
main();

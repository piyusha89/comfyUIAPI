import { client, connectClient } from "./client.js";
import { prepareWorkflow } from "./workflow.js";
import { setupEventListeners } from "./events.js";
import { CONFIG, DEFAULT_OVERRIDES } from "./config.js";
import { getOutputDir, saveGeneratedImages } from "./output.js";
import { loadPromptData } from "./data.js";
import fs from "fs-extra";

/**
 * Execute multiple workflows with ComfyUI
 */
async function runWorkflows(promptOverrides) {
  await connectClient();
  setupEventListeners(client);

  const outputDir = getOutputDir();
  console.log(`\n📤 Enqueueing ${promptOverrides.length} prompt(s)...`);

  for (const [index, overrides] of promptOverrides.entries()) {
    console.log(`\n🔁 Prompt ${index + 1}/${promptOverrides.length}: ${overrides.text}`);

    // If the prompt specifies a post number and a file with that base name
    // already exists in the output directory, skip this prompt to continue
    // from the next one.
    if (overrides.postNumber) {
      try {
        const files = await fs.readdir(outputDir);
        const exists = files.some((f) => {
          return (
            f.startsWith(`${overrides.postNumber}.`) || // e.g. "15.png"
            f.startsWith(`${overrides.postNumber}-`) || // e.g. "15-1.png"
            f === String(overrides.postNumber)
          );
        });

        if (exists) {
          console.log(`⏭️  Skipping Post ${overrides.postNumber}: output already exists.`);
          continue;
        }
      } catch (err) {
        console.warn(`⚠️  Could not read output directory: ${err.message}`);
      }
    }

    const workflowData = await prepareWorkflow(overrides);

    const promptResponse = await client.enqueue(workflowData);
    console.log(`✅ Workflow enqueued with ID: ${promptResponse.prompt_id}`);

    if (promptResponse.images && promptResponse.images.length > 0) {
      await saveGeneratedImages(promptResponse.images, outputDir, overrides.postNumber);
    } else {
      console.log("⚠️  No images returned for this prompt.");
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("🚀 ImageGen - ComfyUI Workflow Executor\n");

  try {
    let promptOverrides = [DEFAULT_OVERRIDES];

    try {
      promptOverrides = await loadPromptData(CONFIG.INPUT_FILE);
      console.log(`📄 Loaded ${promptOverrides.length} prompt(s) from ${CONFIG.INPUT_FILE}`);
    } catch (error) {
      console.warn(`⚠️  Prompt file not loaded: ${error.message}`);
      console.log("➡️  Falling back to default workflow overrides.");
    }

    await runWorkflows(promptOverrides);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Execute main
main();

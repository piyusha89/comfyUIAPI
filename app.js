import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { client, connectClient } from "./client.js";
import { prepareWorkflow } from "./workflow.js";
import { setupEventListeners } from "./events.js";
import { CONFIG, DEFAULT_OVERRIDES } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getOutputDir() {
  return path.resolve(__dirname, CONFIG.OUTPUT_DIR);
}

function getImageExtension(image) {
  if (image.mime) {
    if (image.mime.includes("jpeg")) return "jpg";
    if (image.mime.includes("png")) return "png";
    if (image.mime.includes("webp")) return "webp";
  }

  if (image.type === "url" && typeof image.data === "string") {
    try {
      const url = new URL(image.data);
      const ext = path.extname(url.pathname).replace(".", "");
      if (ext) return ext;
    } catch {
      // ignore invalid URL
    }
  }

  if (typeof image.data === "string" && image.data.startsWith("data:")) {
    const match = /^data:(.+)\/([^;]+);base64,/.exec(image.data);
    if (match) return match[2] || "png";
  }

  return "png";
}

async function getImageBuffer(image) {
  if (image.type === "url" && typeof image.data === "string") {
    const response = await fetch(image.data);
    if (!response.ok) {
      throw new Error(`Failed to download image from URL: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  if (typeof image.data === "string") {
    if (image.data.startsWith("data:")) {
      const [, mime, ext, base64] = image.data.match(/^data:(.+?)\/(.+?);base64,(.+)$/) || [];
      if (!base64) {
        throw new Error("Invalid data URI image format");
      }
      if (!image.mime && mime) {
        image.mime = mime;
      }
      return Buffer.from(base64, "base64");
    }

    // If this is plain base64 without prefix, decode it.
    const isPlainBase64 = /^[A-Za-z0-9+/=\s]+$/.test(image.data);
    if (isPlainBase64) {
      return Buffer.from(image.data, "base64");
    }

    throw new Error("Unsupported image data format");
  }

  if (image.data instanceof ArrayBuffer || ArrayBuffer.isView(image.data)) {
    return Buffer.from(image.data);
  }

  throw new Error("Unsupported image payload type");
}

async function saveGeneratedImages(images, outputDir) {
  if (!images || images.length === 0) {
    console.log("⚠️  No generated images found to save.");
    return;
  }

  await fs.ensureDir(outputDir);

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const extension = getImageExtension(image);
    const filename = `generated-${Date.now()}-${index + 1}.${extension}`;
    const filePath = path.join(outputDir, filename);
    const buffer = await getImageBuffer(image);

    await fs.writeFile(filePath, buffer);
    console.log(`💾 Saved generated image to ${filePath}`);
  }
}

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

/**
 * Setup event listeners for workflow execution
 */
export function setupEventListeners(client) {
  console.log("🎧 Setting up event listeners...");

  // Log ALL events (debugging)
  client.on("*", (event, data) => {
    console.log(`📡 [${event}]`, JSON.stringify(data, null, 2));
  });

  // Execution lifecycle events
  client.on("execution_start", (data) => {
    console.log("✅ Execution started:", data);
  });

  client.on("executing", (data) => {
    console.log("⏳ Executing node:", data);
  });

  client.on("executed", (data) => {
    console.log("✓ Executed event received:", JSON.stringify(data, null, 2));
    if (data.output) {
      console.log("🎉 Generation complete!", data.output);
    }
  });

  client.on("execution_cached", (data) => {
    console.log("⚡ Cached execution:", data);
  });

  // Error handling
  client.on("execution_error", (data) => {
    console.error("❌ Execution error:", data);
  });

  // Status updates
  client.on("status", (data) => {
    console.log("📊 Status:", data);
  });

  console.log("✅ Event listeners ready");
}

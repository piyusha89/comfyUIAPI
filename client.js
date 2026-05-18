import { Client } from "@stable-canvas/comfyui-client";
import WebSocket from "ws";
import fetch from "node-fetch";
import { CONFIG } from "./config.js";

// Singleton client instance
export const client = new Client({
  api_host: CONFIG.API_HOST,
  WebSocket,
  fetch,
});

/**
 * Connect to ComfyUI with WebSocket, fallback to HTTP polling
 */
export async function connectClient() {
  try {
    console.log("🔌 Connecting to ComfyUI via WebSocket...");
    await client.connect({
      websocket: { enabled: true },
      timeout_ms: CONFIG.CONNECT_TIMEOUT_MS,
    });
    console.log("✅ Connected via WebSocket");
  } catch (error) {
    console.warn("⚠️  WebSocket failed, falling back to HTTP polling...", error.message);
    await client.connect({
      polling: { enabled: true, interval: CONFIG.POLLING_INTERVAL_MS },
      timeout_ms: CONFIG.CONNECT_TIMEOUT_MS,
    });
    console.log("✅ Connected via HTTP polling");
  }
}

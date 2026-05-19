import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import { CONFIG } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_PROMPT_KEYS = ["text", "width", "height", "batch_size"];

function normalizeValue(key, value) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === "") return undefined;

  if (["width", "height", "batch_size"].includes(key)) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return trimmed;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function getFieldValue(row, fieldNames) {
  const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = value;
    return acc;
  }, {});

  for (const name of fieldNames) {
    const normalized = String(name).trim().toLowerCase();
    if (normalized in normalizedRow) {
      return normalizedRow[normalized];
    }
  }

  return undefined;
}

function sanitizeOutputName(name) {
  if (name == null) return undefined;
  const trimmed = String(name).trim();
  if (trimmed === "") return undefined;
  const sanitized = trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  return sanitized === "" ? undefined : sanitized;
}

function buildPromptOverrides(row) {
  const prompt = {};

  VALID_PROMPT_KEYS.forEach((key) => {
    if (key in row) {
      const value = normalizeValue(key, row[key]);
      if (value !== undefined) {
        prompt[key] = value;
      }
    }
  });

  const postNumberValue = getFieldValue(row, ["Post #", "Post Number", "post_number", "post"]);
  const sanitizedPostNumber = sanitizeOutputName(postNumberValue);
  if (sanitizedPostNumber) {
    prompt.postNumber = sanitizedPostNumber;
  }

  // If there's no `text` field, try to build it from two CSV columns
  // named "Image Concept Description" and "Text Overlay on Image".
  if (!prompt.text) {
    const desc = row["Image Concept Description"] ?? "";
    const overlay = row["Text Overlay on Image"] ?? "";
    const parts = [];
    if (desc != null && String(desc).trim() !== "") parts.push(String(desc).trim());
    if (overlay != null && String(overlay).trim() !== "") parts.push(String(overlay).trim());
    if (parts.length > 0) {
      prompt.text = parts.join(" ");
    }
  }

  return prompt.text ? prompt : null;
}

export async function loadPromptData(inputFile) {
  const resolvedPath = path.resolve(__dirname, inputFile);

  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(`Prompt file not found: ${resolvedPath}`);
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  let rows = [];

  if (extension === ".csv") {
    const content = await fs.readFile(resolvedPath, "utf8");
    rows = parseCsv(content);
  } else if (extension === ".xls" || extension === ".xlsx") {
    const workbook = xlsx.readFile(resolvedPath, { cellDates: true });
    const sheetName = CONFIG.INPUT_SHEET_NAME || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  } else {
    throw new Error(`Unsupported prompt file type: ${extension}`);
  }

  const prompts = rows.map(buildPromptOverrides).filter(Boolean);
  if (prompts.length === 0) {
    throw new Error(`No valid prompts found in ${inputFile}. Add a 'text' column and at least one row.`);
  }

  return prompts;
}

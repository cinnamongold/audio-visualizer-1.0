import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const psScript = path.join(__dirname, "rename-bluetooth-device.ps1");
const port = Number(process.env.PORT || 3000);

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveFile(req, res) {
  let reqPath = req.url === "/" ? "/index.html" : req.url;
  reqPath = reqPath.split("?")[0];
  const filePath = path.normalize(path.join(publicDir, reqPath));
  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };

    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function runPowerShell(args) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", ...args], {
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: error.message });
    });
  });
}

async function handleDevices(res) {
  const result = await runPowerShell(["-File", psScript, "-Action", "List"]);
  if (result.code !== 0) {
    sendJson(res, 500, {
      error: "Failed to query Bluetooth devices.",
      details: result.stderr.trim() || result.stdout.trim() || "Unknown PowerShell error."
    });
    return;
  }

  try {
    const parsed = JSON.parse(result.stdout);
    sendJson(res, 200, { devices: parsed.devices || [] });
  } catch {
    sendJson(res, 500, {
      error: "Could not parse device list.",
      details: result.stdout.trim() || "No output returned."
    });
  }
}

async function handleRename(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const instanceId = String(body.instanceId || "").trim();
  const newName = String(body.newName || "").trim();

  if (!instanceId || !newName) {
    sendJson(res, 400, { error: "instanceId and newName are required." });
    return;
  }

  const result = await runPowerShell([
    "-File",
    psScript,
    "-Action",
    "Rename",
    "-InstanceId",
    instanceId,
    "-NewName",
    newName
  ]);

  if (result.code !== 0) {
    sendJson(res, 500, {
      success: false,
      error: "Rename failed.",
      details: result.stderr.trim() || result.stdout.trim() || "Unknown PowerShell error."
    });
    return;
  }

  try {
    const parsed = JSON.parse(result.stdout);
    sendJson(res, 200, parsed);
  } catch {
    sendJson(res, 200, { success: true, message: result.stdout.trim() || "Rename attempted." });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/devices")) {
    await handleDevices(res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/rename") {
    await handleRename(req, res);
    return;
  }

  if (req.method === "GET") {
    serveFile(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(port, () => {
  console.log(`Bluetooth Rename Wizard running on http://localhost:${port}`);
});

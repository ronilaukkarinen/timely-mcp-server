// One-time OAuth authentication helper for Timely.
//
// Usage:
// 1. Create an OAuth app at https://app.timelyapp.com/<account_id>/oauth_applications
// 2. Set redirect URI to http://localhost:7890/callback
// 3. Create .env with TIMELY_CLIENT_ID and TIMELY_CLIENT_SECRET
// 4. Run: bun auth.ts
// 5. Open the URL in browser, authorize, tokens are saved to .tokens.json

import { createServer } from "node:https";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const DIR = import.meta.dirname;
const ENV_PATH = resolve(DIR, ".env");
const TOKENS_PATH = resolve(DIR, ".tokens.json");
const PORT = 7890;
const REDIRECT_URI = `https://localhost:${PORT}/callback`;
const CERT_PATH = resolve(DIR, ".localhost.pem");
const KEY_PATH = resolve(DIR, ".localhost-key.pem");

// Generate self-signed cert if missing
if (!existsSync(CERT_PATH) || !existsSync(KEY_PATH)) {
  console.log("Generating self-signed certificate for localhost...");
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/CN=localhost"`,
    { stdio: "pipe" }
  );
}
const TIMELY_BASE = "https://api.timelyapp.com";

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) {
    console.error("Missing .env file. Create one with TIMELY_CLIENT_ID and TIMELY_CLIENT_SECRET");
    process.exit(1);
  }
  const env: Record<string, string> = {};
  for (const line of readFileSync(ENV_PATH, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnv();
const CLIENT_ID = env.TIMELY_CLIENT_ID;
const CLIENT_SECRET = env.TIMELY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing TIMELY_CLIENT_ID or TIMELY_CLIENT_SECRET in .env");
  process.exit(1);
}

const authUrl = `${TIMELY_BASE}/1.1/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log("\nOpen this URL in your browser to authorize:\n");
console.log(authUrl);
console.log("\nWaiting for callback...\n");

const server = createServer({
  key: readFileSync(KEY_PATH),
  cert: readFileSync(CERT_PATH),
}, async (req, res) => {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Missing code parameter");
    return;
  }

  try {
    const tokenRes = await fetch(`${TIMELY_BASE}/1.1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      res.writeHead(500);
      res.end(`Token exchange failed: ${err}`);
      console.error("Token exchange failed:", err);
      process.exit(1);
    }

    const tokens = await tokenRes.json();
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Authenticated! You can close this tab.</h1>");
    console.log("Tokens saved to .tokens.json");
    console.log(`Access token: ${tokens.access_token?.slice(0, 20)}...`);

    const meRes = await fetch(`${TIMELY_BASE}/1.1/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      const accountId = me.accounts?.[0]?.id;
      if (accountId && !env.TIMELY_ACCOUNT_ID) {
        const envContent = readFileSync(ENV_PATH, "utf-8");
        writeFileSync(ENV_PATH, envContent.trimEnd() + `\nTIMELY_ACCOUNT_ID=${accountId}\n`);
        console.log(`Account ID ${accountId} saved to .env`);
      }
    }

    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    res.writeHead(500);
    res.end(`Error: ${err}`);
    console.error(err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`HTTPS callback server listening on port ${PORT}`);
});

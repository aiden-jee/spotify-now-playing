/**
 * One-time script to obtain your Spotify Refresh Token.
 *
 * Prerequisites:
 *   1. Create an app at https://developer.spotify.com/dashboard
 *   2. Add http://localhost:3001/callback as a Redirect URI in the app settings
 *
 * Usage:
 *   node scripts/get-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * The script will:
 *   - Open the Spotify authorization page in your browser
 *   - Wait for the callback with the authorization code
 *   - Exchange the code for tokens
 *   - Print your REFRESH_TOKEN to copy into .env.local
 */

import http from "node:http";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";

// Load .env.local if it exists
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.argv[2];
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
        `
❌  Missing Spotify Credentials!

Please either:
1. Fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in your .env.local file
2. Pass them as arguments: node scripts/get-refresh-token.mjs <ID> <SECRET>
    `
    );
    process.exit(1);
}

const PORT = 3001;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = "user-read-currently-playing user-read-playback-state";

const authUrl =
    `https://accounts.spotify.com/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;

console.log("\n🎵  Opening Spotify authorization page in your browser...\n");

// Cross-platform browser open
try {
    if (process.platform === "win32") {
        execSync(`start "" "${authUrl}"`);
    } else if (process.platform === "darwin") {
        execSync(`open "${authUrl}"`);
    } else {
        execSync(`xdg-open "${authUrl}"`);
    }
} catch {
    console.log("Could not open browser automatically. Open this URL manually:");
    console.log(`\n  ${authUrl}\n`);
}

const server = http.createServer(async (req, res) => {
    if (!req.url?.startsWith("/callback")) return;

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>Authorization failed.</h1><p>You can close this tab.</p>");
        console.error("❌  Authorization denied or failed.");
        server.close();
        process.exit(1);
    }

    // Exchange code for tokens
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
        "base64"
    );

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.refresh_token) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>Failed to get refresh token.</h1>");
        console.error("❌  Token exchange failed:", tokenData);
        server.close();
        process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
        "<h1>✅ Success!</h1><p>You can close this tab and return to the terminal.</p>"
    );

    console.log("\n✅  Success! Here is your refresh token:\n");
    console.log("─".repeat(60));
    console.log(tokenData.refresh_token);
    console.log("─".repeat(60));
    console.log("\nPaste this into your .env.local file as:");
    console.log(`  SPOTIFY_REFRESH_TOKEN=${tokenData.refresh_token}\n`);

    server.close();
    process.exit(0);
});

server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT} for callback...\n`);
});

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ACCOUNT_BASE_URL="${ACCOUNT_BASE_URL:-https://account.vybxlive.com}"
CALLBACK_URL="${CALLBACK_URL:-exp://u.expo.dev/update/00000000-0000-0000-0000-000000000000/--/auth/callback}"
LOGIN_EMAIL="${LOGIN_EMAIL:-dummy+probe@vybxlive.com}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-12345678}"
STATE="${STATE:-probe-state-12345678}"
CODE_CHALLENGE="${CODE_CHALLENGE:-ifE1UbCpVrZVHoDjwueuhbxj57ZJBYB5rPcLFZBU3HI}"
CODE_CHALLENGE_METHOD="${CODE_CHALLENGE_METHOD:-S256}"
EXPECT_SUCCESS_LOGIN="${EXPECT_SUCCESS_LOGIN:-0}"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "[FAIL] node_modules not found in $ROOT_DIR"
  echo "Run: pnpm install"
  exit 1
fi

echo "[INFO] Account base URL: $ACCOUNT_BASE_URL"
echo "[INFO] Login probe email: ${LOGIN_EMAIL}"
echo "[INFO] Expect success login: ${EXPECT_SUCCESS_LOGIN}"

export ACCOUNT_BASE_URL CALLBACK_URL LOGIN_EMAIL LOGIN_PASSWORD STATE
export CODE_CHALLENGE CODE_CHALLENGE_METHOD EXPECT_SUCCESS_LOGIN

node <<'EOF'
const { chromium } = require("@playwright/test");

const accountBaseUrl = process.env.ACCOUNT_BASE_URL;
const callbackUrl = process.env.CALLBACK_URL;
const loginEmail = process.env.LOGIN_EMAIL;
const loginPassword = process.env.LOGIN_PASSWORD;
const state = process.env.STATE;
const codeChallenge = process.env.CODE_CHALLENGE;
const codeChallengeMethod = process.env.CODE_CHALLENGE_METHOD;
const expectSuccessLogin = process.env.EXPECT_SUCCESS_LOGIN === "1";

const fail = (message) => {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
};

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

if (!normalize(accountBaseUrl)) fail("ACCOUNT_BASE_URL is required.");
if (!normalize(callbackUrl)) fail("CALLBACK_URL is required.");
if (!normalize(loginEmail)) fail("LOGIN_EMAIL is required.");
if (!normalize(loginPassword)) fail("LOGIN_PASSWORD is required.");

const authUrl = new URL("/auth", accountBaseUrl);
authUrl.searchParams.set("mode", "login");
authUrl.searchParams.set("mobile", "1");
authUrl.searchParams.set("callback", callbackUrl);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", codeChallengeMethod);

const badDtoRegex =
  /email must be an email|password must be longer than or equal to 8 characters|password must be a string/i;

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let loginRequest = null;
  let loginResponse = null;

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/v1/auth/login")
    ) {
      const headers = request.headers();
      const postData = request.postData() ?? "";
      let parsedBody = null;
      try {
        parsedBody = JSON.parse(postData);
      } catch {
        parsedBody = null;
      }
      loginRequest = {
        contentType: headers["content-type"] ?? "",
        xClient: headers["x-client"] ?? "",
        body: parsedBody,
      };
    }
  });

  page.on("response", async (response) => {
    if (
      response.request().method() === "POST" &&
      response.url().includes("/api/v1/auth/login")
    ) {
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch {
        bodyText = "";
      }
      loginResponse = {
        status: response.status(),
        bodyText,
      };
    }
  });

  await page.goto(authUrl.toString(), { waitUntil: "domcontentloaded" });
  await page.fill("#email", loginEmail);
  await page.fill("#password", loginPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  await browser.close();

  if (!loginRequest) fail("No login request was captured.");
  if (!loginResponse) fail("No login response was captured.");

  if (loginRequest.contentType.toLowerCase() !== "application/json") {
    fail(
      `Expected content-type 'application/json' but got '${loginRequest.contentType || "NONE"}'.`,
    );
  }

  if (loginRequest.xClient.toLowerCase() !== "mobile") {
    fail(
      `Expected x-client 'mobile' but got '${loginRequest.xClient || "NONE"}'.`,
    );
  }

  const email = loginRequest.body?.email;
  const password = loginRequest.body?.password;

  if (typeof email !== "string" || email.trim().length === 0) {
    fail("Login request body email was missing or invalid.");
  }

  if (typeof password !== "string" || password.length < 8) {
    fail("Login request body password was missing or invalid.");
  }

  if (badDtoRegex.test(loginResponse.bodyText)) {
    fail(
      `Backend returned DTO validation error again: ${loginResponse.bodyText.slice(0, 220)}`,
    );
  }

  if (expectSuccessLogin) {
    if (loginResponse.status !== 200) {
      fail(`Expected 200 success login, got ${loginResponse.status}.`);
    }
    if (!/access_token/i.test(loginResponse.bodyText)) {
      fail("Expected access_token in successful mobile login response.");
    }
  } else {
    const allowed = new Set([200, 401, 403, 429]);
    if (!allowed.has(loginResponse.status)) {
      fail(
        `Unexpected login status ${loginResponse.status}. Body: ${loginResponse.bodyText.slice(0, 220)}`,
      );
    }
  }

  console.log("[OK] Mobile auth probe passed.");
  console.log(
    `[OK] Request headers => content-type: ${loginRequest.contentType}, x-client: ${loginRequest.xClient}`,
  );
  console.log(
    `[OK] Login response status => ${loginResponse.status} (DTO validation regression not detected)`,
  );
};

run().catch((error) => {
  console.error("[FAIL] Mobile auth probe failed with unexpected error.");
  console.error(error);
  process.exit(1);
});
EOF

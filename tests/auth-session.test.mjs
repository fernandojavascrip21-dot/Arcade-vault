// Run: node --test tests/auth-session.test.mjs (no additional test dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { NextRequest } from "next/server.js";

const nodeRequire = createRequire(import.meta.url);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

// Compile the actual TS modules in memory; replace only the external Auth API.
function load(file, mocks = {}) {
  const filename = path.resolve(testDirectory, "..", file);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const loadedModule = { exports: {} };
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/")) return load(id.slice(2) + ".ts", mocks);
    return nodeRequire(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`, {
    filename,
  })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const { getAuthenticatedAt, isSessionExpired } = load("lib/auth.ts");
const { SESSION_MAX_AGE_SECONDS, AUTH_PAGE_NOTICES } = load(
  "lib/constants/auth.ts",
);
const now = Date.now() / 1000;

test("session age: recent, nearly 7 days, boundary, expired, missing/invalid amr", () => {
  for (const [amr, expected] of [
    [[{ timestamp: now }], false],
    [[{ timestamp: now - 7 * 86400 + 3600 }], false],
    [[{ timestamp: now - SESSION_MAX_AGE_SECONDS }], false],
    [[{ timestamp: now - SESSION_MAX_AGE_SECONDS - 1 }], true],
    [undefined, false],
    [[], false],
    [[null, {}, { timestamp: "old" }, { timestamp: NaN }], false],
    [[{ timestamp: now }, { timestamp: now - 8 * 86400 }], true],
  ]) {
    assert.equal(isSessionExpired(getAuthenticatedAt(amr), now), expected);
  }
  assert.equal(isSessionExpired(now - 61, now, 60), true);
  assert.equal(SESSION_MAX_AGE_SECONDS, 604800);
  assert.equal(
    AUTH_PAGE_NOTICES["session-expired"],
    "Tu sesión venció. Vuelve a iniciar sesión.",
  );
});

async function run(
  url,
  {
    expired = false,
    authenticated = true,
    method = "GET",
    error = null,
    amr,
  } = {},
) {
  let signOutCalls = 0;
  const request = new NextRequest(`https://arcade.example${url}`, {
    method,
    headers: { cookie: "sb-test=old; sb-test.1=old-chunk" },
  });
  const { updateSession } = load("lib/supabase/proxy.ts", {
    "@supabase/ssr": {
      createServerClient: (_url, _key, { cookies }) => ({
        auth: {
          getClaims: async () => {
            // Exercise refresh followed by sign-out in the same request.
            cookies.setAll([
              {
                name: "sb-test",
                value: "refreshed",
                options: { path: "/", sameSite: "lax" },
              },
            ]);
            return {
              data: authenticated
                ? {
                    claims: {
                      sub: "player",
                      amr: amr ?? [
                        { timestamp: expired ? now - 8 * 86400 : now },
                      ],
                    },
                  }
                : null,
              error,
            };
          },
          signOut: async (options) => {
            assert.equal(options.scope, "local");
            signOutCalls++;
            cookies.setAll(
              ["sb-test", "sb-test.1"].map((name) => ({
                name,
                value: "",
                options: { path: "/", maxAge: 0, sameSite: "lax" },
              })),
            );
            return { error: null };
          },
        },
      }),
    },
  });
  return { response: await updateSession(request), request, signOutCalls };
}

test("expired GET redirects with safe return path and deleted cookies", async () => {
  for (const route of [
    "/play/bloques?skin=retro",
    "/auth/player-name",
    "/auth/reset-password",
  ]) {
    const { response, signOutCalls } = await run(route, { expired: true });
    const target = new URL(response.headers.get("location"));
    assert.equal(target.pathname, "/auth");
    assert.equal(target.searchParams.get("error"), "session-expired");
    assert.equal(target.searchParams.get("next"), route);
    assert.equal(signOutCalls, 1);
    for (const name of ["sb-test", "sb-test.1"]) {
      assert.equal(response.cookies.get(name).value, "");
      assert.equal(response.cookies.get(name).maxAge, 0);
    }
  }
});

test("expired non-GET requests continue with cleared request and response cookies", async () => {
  for (const method of ["POST", "PUT", "HEAD"]) {
    for (const route of [
      "/play/bloques",
      "/auth/player-name",
      "/auth/reset-password",
    ]) {
      const { response, request, signOutCalls } = await run(route, {
        method,
        expired: true,
      });
      assert.equal(response.headers.get("location"), null);
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(signOutCalls, 1);
      assert.equal(request.cookies.get("sb-test").value, "");
      assert.equal(response.cookies.get("sb-test").maxAge, 0);
      assert.match(
        response.headers.get("x-middleware-request-cookie"),
        /sb-test=;/,
      );
    }
  }
});

test("public auth routes cannot loop, even with an expired session", async () => {
  for (const route of [
    "/auth",
    "/auth/callback?code=test",
    "/auth/check-email",
    "/auth/forgot-password",
  ]) {
    for (const expired of [true, false]) {
      const { response } = await run(route, { expired });
      assert.equal(response.headers.get("location"), null);
    }
  }
});

test("only account steps require verified claims; valid sessions may proceed", async () => {
  for (const route of [
    "/auth/player-name?next=%2Fgames",
    "/auth/reset-password",
  ]) {
    for (const session of [
      { authenticated: false },
      { error: { message: "invalid JWT" } },
    ]) {
      const { response } = await run(route, session);
      const target = new URL(response.headers.get("location"));
      assert.equal(target.pathname, "/auth");
      assert.equal(target.searchParams.get("next"), route);
      assert.equal(target.searchParams.has("error"), false);
      assert.equal(response.cookies.get("sb-test").value, "refreshed");
    }
    const { response } = await run(route);
    assert.equal(response.headers.get("location"), null);
  }
});

test("guests and accounts without profiles may browse and play", async () => {
  for (const route of [
    "/",
    "/games",
    "/game/bloques",
    "/play/bloques",
    "/hall-of-fame",
    "/about",
  ]) {
    for (const authenticated of [true, false]) {
      const { response } = await run(route, { authenticated });
      assert.equal(response.headers.get("location"), null);
    }
    const { response } = await run(route, { amr: [] });
    assert.equal(response.headers.get("location"), null);
  }
});

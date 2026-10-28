// Run: node --test tests/site-url.test.mjs (no additional test dependencies).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "lib/site-url.ts",
);
const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const loaded = { exports: {} };
vm.runInThisContext(`(function(module,exports){${outputText}\n})`)(
  loaded,
  loaded.exports,
);
const { getSiteUrl } = loaded.exports;

function withEnv(env, fn) {
  const prev = {
    SITE_URL: process.env.SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const prod = { NODE_ENV: "production" };
const dev = { NODE_ENV: "development" };

test("https válido devuelve el origen", () => {
  withEnv({ ...prod, SITE_URL: "https://arcadevault.example" }, () =>
    assert.equal(getSiteUrl(), "https://arcadevault.example"),
  );
});

test("quita la barra final y la ruta", () => {
  withEnv({ ...prod, SITE_URL: "https://arcadevault.example/" }, () =>
    assert.equal(getSiteUrl(), "https://arcadevault.example"),
  );
  withEnv({ ...prod, SITE_URL: "https://arcadevault.example/auth?x=1" }, () =>
    assert.equal(getSiteUrl(), "https://arcadevault.example"),
  );
});

test("sin definir en development usa localhost", () => {
  withEnv({ ...dev, SITE_URL: undefined }, () =>
    assert.equal(getSiteUrl(), "http://localhost:3000"),
  );
});

test("sin definir en producción lanza", () => {
  withEnv({ ...prod, SITE_URL: undefined }, () =>
    assert.throws(() => getSiteUrl()),
  );
});

test("http en producción lanza", () => {
  withEnv({ ...prod, SITE_URL: "http://arcadevault.example" }, () =>
    assert.throws(() => getSiteUrl()),
  );
});

test("valor basura en producción lanza", () => {
  withEnv({ ...prod, SITE_URL: "no es una url" }, () =>
    assert.throws(() => getSiteUrl()),
  );
  withEnv({ ...prod, SITE_URL: "javascript:alert(1)" }, () =>
    assert.throws(() => getSiteUrl()),
  );
});

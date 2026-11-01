import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("GET /health returns 200 and ok status", async () => {
  // Use native http request against app
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ok");
    assert.equal(data.service, "node-server");
  } finally {
    server.close();
  }
});

test("GET /ready returns 200 when database is connected", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/ready`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ready");
    assert.equal(data.checks.database, "connected");
  } finally {
    server.close();
  }
});


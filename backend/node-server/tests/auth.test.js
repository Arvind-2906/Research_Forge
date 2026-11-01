import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import app from "../src/app.js";
import { config } from "../src/config/index.js";
import { requireAuth, requireInternalServiceAuth } from "../src/middleware/auth.js";
import { requireWorkspaceMember } from "../src/middleware/workspaceAuth.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { prisma } from "../src/services/prisma.js";

test("Better Auth - /api/auth/get-session returns null for unauthenticated client", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/auth/get-session`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data, null);
  } finally {
    server.close();
  }
});

test("requireAuth middleware - returns 401 UNAUTHORIZED when no session exists", async () => {
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/users/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, "UNAUTHORIZED");
  } finally {
    server.close();
  }
});

test("requireInternalServiceAuth middleware - rejects requests without service key (403)", async () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.get("/test-internal", requireInternalServiceAuth, (req, res) => {
    res.json({ success: true });
  });
  testApp.use(errorHandler);

  const server = testApp.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/test-internal`);
    assert.equal(res.status, 403);
  } finally {
    server.close();
  }
});

test("requireInternalServiceAuth middleware - allows requests with valid X-Internal-Service-Key", async () => {
  const testApp = express();
  testApp.use(express.json());
  testApp.get("/test-internal", requireInternalServiceAuth, (req, res) => {
    res.json({ success: true });
  });
  testApp.use(errorHandler);

  const server = testApp.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/test-internal`, {
      headers: {
        "X-Internal-Service-Key": config.INTERNAL_SERVICE_SECRET,
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  } finally {
    server.close();
  }
});

test("requireWorkspaceMember - returns 400 when workspace ID is missing", async () => {
  const testApp = express();
  testApp.use((req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  });
  testApp.get("/workspace-test", requireWorkspaceMember(), (req, res) => {
    res.json({ success: true });
  });
  testApp.use(errorHandler);

  const server = testApp.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/workspace-test`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error.code, "MISSING_WORKSPACE_ID");
  } finally {
    server.close();
  }
});

test("requireWorkspaceMember - returns 404 when workspace does not exist", async () => {
  const testApp = express();
  testApp.use((req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  });
  testApp.get("/workspaces/:workspaceId/test", requireWorkspaceMember(), (req, res) => {
    res.json({ success: true });
  });
  testApp.use(errorHandler);

  const server = testApp.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/workspaces/nonexistent-workspace-id/test`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error.code, "WORKSPACE_NOT_FOUND");
  } finally {
    server.close();
  }
});

test("Workspace authorization & RBAC - verifies membership and roles with live database", async () => {
  // Create a temporary test user and workspace in database
  const user = await prisma.user.create({
    data: {
      name: "Phase2 Test User",
      email: `phase2-${Date.now()}@example.com`,
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Phase2 Test Workspace",
      description: "Testing workspace RBAC",
      ownerId: user.id,
    },
  });

  const testApp = express();
  testApp.use((req, res, next) => {
    req.user = user;
    next();
  });
  testApp.get(
    "/workspaces/:workspaceId/owner-only",
    requireWorkspaceMember(["OWNER"]),
    (req, res) => {
      res.json({ success: true, role: req.workspaceRole });
    }
  );
  testApp.use(errorHandler);

  const server = testApp.listen(0);
  const port = server.address().port;

  try {
    // 1. Owner access check -> 200
    const res = await fetch(`http://localhost:${port}/workspaces/${workspace.id}/owner-only`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.role, "OWNER");

    // 2. Non-member access check -> 403
    const stranger = await prisma.user.create({
      data: {
        name: "Stranger User",
        email: `stranger-${Date.now()}@example.com`,
      },
    });

    const strangerApp = express();
    strangerApp.use((req, res, next) => {
      req.user = stranger;
      next();
    });
    strangerApp.get(
      "/workspaces/:workspaceId/check",
      requireWorkspaceMember(),
      (req, res) => res.json({ success: true })
    );
    strangerApp.use(errorHandler);

    const strangerServer = strangerApp.listen(0);
    const strangerPort = strangerServer.address().port;

    try {
      const strangerRes = await fetch(
        `http://localhost:${strangerPort}/workspaces/${workspace.id}/check`
      );
      assert.equal(strangerRes.status, 403);
      const strangerData = await strangerRes.json();
      assert.equal(strangerData.error.code, "WORKSPACE_FORBIDDEN");
    } finally {
      strangerServer.close();
      await prisma.user.delete({ where: { id: stranger.id } });
    }
  } finally {
    server.close();
    // Cleanup created workspace and user
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

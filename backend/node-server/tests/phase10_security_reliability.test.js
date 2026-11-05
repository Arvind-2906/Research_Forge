import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/services/prisma.js";
import { isSafeUrl, sanitizeSecrets } from "../src/utils/security.js";
import { createRateLimiter } from "../src/middleware/rateLimiter.js";
import { WorkspaceService } from "../src/services/workspaceService.js";
import { ProjectService } from "../src/services/projectService.js";
import { ResearchService } from "../src/services/researchService.js";
import { ReportService } from "../src/services/reportService.js";
import { KnowledgeGraphService } from "../src/services/knowledgeGraphService.js";
import { AnalyticsService } from "../src/services/analyticsService.js";

test("Phase 10 - Security, Reliability & BOLA Hardening Suite", async () => {
  // ==========================================
  // 1. SSRF Defense Tests
  // ==========================================
  const ssrfTargets = [
    "http://127.0.0.1:8080/admin",
    "http://127.0.0.1",
    "http://localhost:5000",
    "http://10.0.1.20/db",
    "http://172.16.5.1/secret",
    "http://192.168.0.1",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal",
    "ftp://example.com/test",
    "file:///etc/hosts",
    "http://internal.service.local",
  ];

  for (const url of ssrfTargets) {
    assert.equal(isSafeUrl(url), false, `Target should be rejected for SSRF: ${url}`);
  }

  const validUrls = [
    "https://arxiv.org/abs/2301.0001",
    "https://nature.com/articles/superconductor",
    "https://example.com/api/v1/feed",
    "http://example.org",
  ];

  for (const url of validUrls) {
    assert.equal(isSafeUrl(url), true, `Legitimate target should be allowed: ${url}`);
  }

  // ==========================================
  // 2. Secret Scrubbing & Credential Leakage Defense
  // ==========================================
  const rawDbUrl = "postgresql://neondb_owner:npg_mySecretPass123@ep-cool-pooler.aws.neon.tech/neondb?sslmode=require";
  const scrubbedUrl = sanitizeSecrets(rawDbUrl);
  assert.ok(!scrubbedUrl.includes("npg_mySecretPass123"));
  assert.ok(scrubbedUrl.includes("[REDACTED_PASSWORD]"));

  const sensitivePayload = {
    user: "researcher_1",
    apiKey: "rf_live_sec_abcdef1234567890",
    passwordHash: "$2b$10$encryptedSecretHash",
    nested: {
      auth_token: "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      safeField: "Public research note",
    },
  };

  const scrubbedPayload = sanitizeSecrets(sensitivePayload);
  assert.equal(scrubbedPayload.apiKey, "[REDACTED]");
  assert.equal(scrubbedPayload.passwordHash, "[REDACTED]");
  assert.equal(scrubbedPayload.nested.auth_token, "[REDACTED]");
  assert.equal(scrubbedPayload.nested.safeField, "Public research note");

  // ==========================================
  // 3. Rate Limiting Middleware
  // ==========================================
  const limiter = createRateLimiter({
    windowMs: 5000,
    max: 3,
    message: "Rate limit reached.",
  });

  const req = {
    ip: "192.0.2.1",
    headers: { "x-test-rate-limit": "true" },
  };
  const resHeaders = {};
  const res = {
    setHeader(name, val) {
      resHeaders[name] = val;
    },
  };

  let hitCount = 0;
  let rejectedError = null;

  for (let i = 0; i < 4; i++) {
    limiter(req, res, (err) => {
      if (err) {
        rejectedError = err;
      } else {
        hitCount++;
      }
    });
  }

  assert.equal(hitCount, 3);
  assert.ok(rejectedError);
  assert.equal(rejectedError.statusCode, 429);
  assert.equal(rejectedError.code, "TOO_MANY_REQUESTS");
  assert.ok(resHeaders["Retry-After"]);

  // ==========================================
  // 4. BOLA & Cross-Workspace Data Isolation
  // ==========================================
  const timestamp = Date.now();
  const userA = await prisma.user.create({
    data: { name: "User Sec A", email: `sec-a-${timestamp}@example.com` },
  });
  const userB = await prisma.user.create({
    data: { name: "User Sec B", email: `sec-b-${timestamp}@example.com` },
  });

  const workspaceA = await WorkspaceService.createWorkspace(userA.id, {
    name: "Confidential Project Titan",
  });
  const projectA = await ProjectService.createProject(userA.id, {
    workspaceId: workspaceA.id,
    title: "Quantum Key Distribution",
  });
  const runA = await ResearchService.createRun(userA.id, {
    projectId: projectA.id,
    question: "BB84 protocol error correction thresholds",
  });
  const reportA = await prisma.researchReport.create({
    data: {
      runId: runA.id,
      title: "QKD Security Proof",
      contentMarkdown: "Theoretical bounds verified.",
      status: "COMPLETED",
    },
  });
  const nodeA = await KnowledgeGraphService.createNode(userA.id, {
    workspaceId: workspaceA.id,
    name: "BB84 Protocol",
    type: "TECHNOLOGY",
  });

  try {
    // 4.1 User B cannot read User A's workspace
    await assert.rejects(
      async () => await WorkspaceService.getWorkspaceById(workspaceA.id, userB.id),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "WORKSPACE_FORBIDDEN");
        return true;
      }
    );

    // 4.2 User B cannot read User A's project
    await assert.rejects(
      async () => await ProjectService.getProjectById(projectA.id, userB.id),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "PROJECT_FORBIDDEN");
        return true;
      }
    );

    // 4.3 User B cannot read User A's research run
    await assert.rejects(
      async () => await ResearchService.getRunById(runA.id, userB.id),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "RUN_FORBIDDEN");
        return true;
      }
    );

    // 4.4 User B cannot read User A's report
    await assert.rejects(
      async () => await ReportService.getReportById(reportA.id, userB.id),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "REPORT_FORBIDDEN");
        return true;
      }
    );

    // 4.5 User B cannot read User A's knowledge graph node
    await assert.rejects(
      async () => await KnowledgeGraphService.getNodeById(userB.id, nodeA.id),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "WORKSPACE_FORBIDDEN");
        return true;
      }
    );

    // 4.6 User B cannot read User A's analytics overview
    await assert.rejects(
      async () => await AnalyticsService.getOverview(workspaceA.id, userB.id),
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "WORKSPACE_FORBIDDEN");
        return true;
      }
    );

    // ==========================================
    // 5. SQL Injection Resilience
    // ==========================================
    const sqlInjectionQueries = [
      "'; DROP TABLE \"User\"; --",
      "' OR '1'='1",
      "admin' --",
      "' UNION SELECT * FROM \"Workspace\" --",
    ];

    for (const sqli of sqlInjectionQueries) {
      // Searching with SQL injection string is safely parameterized and does not crash or execute raw SQL
      const searchRes = await ProjectService.listProjects(workspaceA.id, userA.id, {
        search: sqli,
      });
      assert.ok(searchRes);
      assert.equal(searchRes.pagination.total, 0);
    }
  } finally {
    try {
      await prisma.workspace.delete({ where: { id: workspaceA.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    } catch (_) {}
  }
});

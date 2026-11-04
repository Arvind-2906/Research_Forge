import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/services/prisma.js";
import { WorkspaceService } from "../src/services/workspaceService.js";
import { ProjectService } from "../src/services/projectService.js";
import { ResearchService } from "../src/services/researchService.js";
import { ResearchController } from "../src/controllers/researchController.js";

test("Phase 8 - Real-Time Research Events, Monotonic Sequencing & Status Sync", async () => {
  const userA = await prisma.user.create({
    data: { name: "Events User A", email: `events-a-${Date.now()}@example.com` },
  });
  const userB = await prisma.user.create({
    data: { name: "Events User B", email: `events-b-${Date.now()}@example.com` },
  });

  const workspace = await WorkspaceService.createWorkspace(userA.id, {
    name: "Events Streaming Lab",
  });

  const project = await ProjectService.createProject(userA.id, {
    workspaceId: workspace.id,
    title: "Autonomous Intelligence Synthesis",
  });

  try {
    // 1. Create Run -> triggers run.created (sequence 1)
    const run = await ResearchService.createRun(userA.id, {
      projectId: project.id,
      question: "How do persistent SSE events scale under high-concurrency multi-agent workloads?",
    });
    assert.ok(run.id);
    assert.equal(run.status, "QUEUED");

    // Verify initial run.created event
    let events = await ResearchService.getRunEvents(run.id, userA.id, {});
    assert.equal(events.pagination.total, 1);
    assert.equal(events.items[0].eventType, "run.created");
    assert.equal(events.items[0].sequence, 1);

    // 2. Start Run -> triggers run.started (sequence 2)
    const started = await ResearchService.startRun(run.id, userA.id);
    assert.equal(started.run.status, "PLANNING");

    events = await ResearchService.getRunEvents(run.id, userA.id, {});
    assert.equal(events.pagination.total, 2);
    assert.equal(events.items[1].eventType, "run.started");
    assert.equal(events.items[1].sequence, 2);

    // 3. Pause Run -> triggers run.paused (sequence 3)
    const paused = await ResearchService.pauseRun(run.id, userA.id);
    assert.equal(paused.status, "PAUSED");

    events = await ResearchService.getRunEvents(run.id, userA.id, {});
    assert.equal(events.pagination.total, 3);
    assert.equal(events.items[2].eventType, "run.paused");
    assert.equal(events.items[2].sequence, 3);

    // 4. Resume Run -> triggers run.resumed (sequence 4)
    const resumed = await ResearchService.resumeRun(run.id, userA.id);
    assert.equal(resumed.status, "RUNNING");

    events = await ResearchService.getRunEvents(run.id, userA.id, {});
    assert.equal(events.pagination.total, 4);
    assert.equal(events.items[3].eventType, "run.resumed");
    assert.equal(events.items[3].sequence, 4);

    // 5. Cancel Run -> triggers run.cancelled (sequence 5)
    const cancelled = await ResearchService.cancelRun(run.id, userA.id);
    assert.equal(cancelled.status, "CANCELLED");

    events = await ResearchService.getRunEvents(run.id, userA.id, {});
    assert.equal(events.pagination.total, 5);
    assert.equal(events.items[4].eventType, "run.cancelled");
    assert.equal(events.items[4].sequence, 5);

    // 6. Access Control: User B (unauthorized) cannot access events
    await assert.rejects(
      async () => {
        await ResearchService.getRunEvents(run.id, userB.id, {});
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "RUN_FORBIDDEN");
        return true;
      }
    );

    // 7. Test SSE Stream Header and Format Handshake
    const writtenChunks = [];
    const headersSet = {};
    let closeListener;
    const mockReq = {
      params: { runId: run.id },
      user: { id: userA.id },
      headers: {},
      query: { stream: "true" },
      on: (event, handler) => {
        if (event === "close") closeListener = handler;
      },
    };
    const mockRes = {
      setHeader: (k, v) => {
        headersSet[k.toLowerCase()] = v;
      },
      flushHeaders: () => { },
      write: (chunk) => {
        writtenChunks.push(chunk);
      },
      end: () => { },
      writableEnded: false,
    };

    await ResearchController.streamEvents(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert.equal(headersSet["content-type"], "text/event-stream");
    assert.equal(headersSet["cache-control"], "no-cache");
    assert.equal(headersSet["connection"], "keep-alive");

    // Must have formatted events as SSE
    const combinedOutput = writtenChunks.join("");
    assert.ok(combinedOutput.includes("event: run.created"));
    assert.ok(combinedOutput.includes("event: run.started"));

    // Close mock connection cleanly
    closeListener?.();
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  }
});
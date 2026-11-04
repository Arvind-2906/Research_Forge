import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/services/prisma.js";
import { MemoryService } from "../src/services/memoryService.js";
import { WorkspaceService } from "../src/services/workspaceService.js";

test("Phase 7 - Scoped Memory System & Access Control", async () => {
  const userA = await prisma.user.create({
    data: { name: "User A", email: `user-a-${Date.now()}@example.com` },
  });
  const userB = await prisma.user.create({
    data: { name: "User B", email: `user-b-${Date.now()}@example.com` },
  });

  const workspace = await WorkspaceService.createWorkspace(userA.id, {
    name: "AI Knowledge Workspace",
  });

  try {
    // 1. Create USER-scoped memory
    const userMemory = await MemoryService.createMemory(userA.id, {
      content: "Prefers concise, point-form summaries of research findings.",
      type: "USER_PREFERENCE",
      scope: "USER",
    });
    assert.ok(userMemory.id);
    assert.equal(userMemory.scope, "USER");
    assert.equal(userMemory.userId, userA.id);

    // 2. Create WORKSPACE-scoped memory
    const wsMemory = await MemoryService.createMemory(userA.id, {
      content: "All quantum research should benchmark against Qiskit v1.0 standard.",
      type: "IMPORTANT_FACT",
      scope: "WORKSPACE",
      workspaceId: workspace.id,
    });
    assert.ok(wsMemory.id);
    assert.equal(wsMemory.scope, "WORKSPACE");
    assert.equal(wsMemory.workspaceId, workspace.id);

    // 3. User A can retrieve their own user memory
    const retrieved = await MemoryService.getMemoryById(userMemory.id, userA.id);
    assert.equal(retrieved.id, userMemory.id);

    // 4. User B CANNOT access User A's private user memory (403 forbidden)
    await assert.rejects(
      async () => {
        await MemoryService.getMemoryById(userMemory.id, userB.id);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "MEMORY_FORBIDDEN");
        return true;
      }
    );

    // 5. Update Memory
    const updated = await MemoryService.updateMemory(wsMemory.id, userA.id, {
      content: "Benchmark against Qiskit v1.2 standard.",
      metadata: { revised: true },
    });
    assert.equal(updated.content, "Benchmark against Qiskit v1.2 standard.");

    // 6. List Memories for User A
    const listRes = await MemoryService.listMemories(userA.id, { workspaceId: workspace.id });
    assert.ok(listRes.items.some((m) => m.id === wsMemory.id));

    // 7. Delete Memory
    const deleteRes = await MemoryService.deleteMemory(userMemory.id, userA.id);
    assert.equal(deleteRes.success, true);
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
  }
});


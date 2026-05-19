/**
 * Seed script for local testing — no GitHub required.
 * Calls the Python AI service with a sample C diff, then creates
 * the necessary DB records and prints the quiz URL.
 *
 * Usage:
 *   node scripts/seed-test.mjs
 */

import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Sample C diff with intentional bugs for interesting analysis
const SAMPLE_DIFF = `diff --git a/arena_allocator.c b/arena_allocator.c
new file mode 100644
--- /dev/null
+++ b/arena_allocator.c
@@ -0,0 +1,55 @@
+#include <stdlib.h>
+#include <string.h>
+#include <stdio.h>
+
+typedef struct Arena {
+    char *buffer;
+    size_t size;
+    size_t offset;
+} Arena;
+
+Arena* arena_create(size_t size) {
+    Arena *a = malloc(sizeof(Arena));
+    a->buffer = malloc(size);
+    a->size = size;
+    a->offset = 0;
+    return a;
+}
+
+void* arena_alloc(Arena *a, size_t n) {
+    if (a->offset + n > a->size) {
+        fprintf(stderr, "Arena full\\n");
+        return NULL;
+    }
+    void *ptr = a->buffer + a->offset;
+    a->offset += n;
+    return ptr;
+}
+
+char* arena_strdup(Arena *a, const char *src) {
+    size_t len = strlen(src);
+    char *dst = arena_alloc(a, len);
+    memcpy(dst, src, len);
+    return dst;
+}
+
+void arena_reset(Arena *a) {
+    a->offset = 0;
+}
+
+void arena_free(Arena *a) {
+    free(a->buffer);
+    free(a);
+}`;

async function main() {
  console.log("1. Checking AI service health...");
  const health = await fetch(`${AI_SERVICE_URL}/healthz`).catch(() => null);
  if (!health?.ok) {
    console.error(`AI service not reachable at ${AI_SERVICE_URL}. Start it first.`);
    process.exit(1);
  }
  console.log("   OK");

  console.log("2. Running trial (this takes 15-30s)...");
  const trialRes = await fetch(`${AI_SERVICE_URL}/api/trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diff: SAMPLE_DIFF,
      repo_full_name: "test/arena-allocator",
      pr_number: 1,
      language: "c",
    }),
  });

  if (!trialRes.ok) {
    console.error("Trial failed:", await trialRes.text());
    process.exit(1);
  }

  const trial = await trialRes.json();
  console.log("   Done — verdict:", trial.verdict.recommendation, `(risk ${trial.verdict.risk_score}/10)`);

  console.log("3. Inserting DB records...");
  const dbPath = path.join(__dirname, "..", "prisma", "dev.db");
  const db = createClient({ url: `file:${dbPath}` });

  // Upsert fake installation
  await db.execute({
    sql: `INSERT OR IGNORE INTO Installation (installationId, accountLogin, accountType, createdAt)
          VALUES (?, ?, ?, datetime('now'))`,
    args: [99999, "test-user", "User"],
  });

  // Upsert fake PR
  const prResult = await db.execute({
    sql: `INSERT OR IGNORE INTO PullRequest
            (repoFullName, prNumber, headSha, title, authorLogin, status, installationId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    args: [
      "test/arena-allocator",
      1,
      "abc1234",
      "feat: add arena allocator",
      "test-dev",
      "awaiting_proof",
      99999,
    ],
  });

  const prRow = await db.execute({
    sql: `SELECT id FROM PullRequest WHERE repoFullName = ? AND prNumber = ? AND headSha = ?`,
    args: ["test/arena-allocator", 1, "abc1234"],
  });
  const prId = Number(prRow.rows[0][0]);

  // Create trial
  await db.execute({
    sql: `INSERT INTO Trial (headSha, defense, prosecution, questions, verdict, pullRequestId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      "abc1234",
      JSON.stringify(trial.defense),
      JSON.stringify(trial.prosecution),
      JSON.stringify(trial.questions),
      JSON.stringify(trial.verdict),
      prId,
    ],
  });

  // Create quiz session
  const sessionResult = await db.execute({
    sql: `INSERT INTO QuizSession (answers, pullRequestId, createdAt) VALUES (?, ?, datetime('now'))`,
    args: ["[]", prId],
  });

  const sessionId = Number(sessionResult.lastInsertRowid);

  console.log("   Done — session ID:", sessionId);
  console.log();
  console.log("✓ Quiz page ready:");
  console.log(`  ${APP_URL}/quiz/${sessionId}`);
  console.log();
  console.log("Questions generated:");
  for (const q of trial.questions.items) {
    console.log(`  [${q.id}] ${q.text}`);
  }
}

main().catch(console.error);

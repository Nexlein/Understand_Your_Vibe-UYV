-- CreateTable
CREATE TABLE "Installation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "installationId" INTEGER NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repoFullName" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "headSha" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorLogin" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "installationId" INTEGER NOT NULL,
    CONSTRAINT "PullRequest_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation" ("installationId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "headSha" TEXT NOT NULL,
    "defense" TEXT NOT NULL,
    "prosecution" TEXT NOT NULL,
    "questions" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pullRequestId" INTEGER NOT NULL,
    CONSTRAINT "Trial_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "answers" TEXT NOT NULL,
    "understandScore" INTEGER,
    "perQuestion" TEXT,
    "passed" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pullRequestId" INTEGER NOT NULL,
    CONSTRAINT "QuizSession_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Installation_installationId_key" ON "Installation"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repoFullName_prNumber_headSha_key" ON "PullRequest"("repoFullName", "prNumber", "headSha");

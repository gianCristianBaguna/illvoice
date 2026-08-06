-- CreateTable
CREATE TABLE "SeverityKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL UNIQUE,
    "severity" "Severity" NOT NULL,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeverityKeyword_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SeverityKeyword_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

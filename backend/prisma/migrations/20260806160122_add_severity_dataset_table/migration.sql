-- CreateTable
CREATE TABLE "SeverityDataset" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL UNIQUE,
    "source" TEXT NOT NULL DEFAULT 'credible_severity_dataset',
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "barangayId" TEXT,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeverityDataset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SeverityDataset_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

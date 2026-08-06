export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FraudFlag {
  type: string;
  reason: string;
  severity: FraudSeverity;
  details?: Record<string, unknown>;
}

export interface FraudCheckResult {
  isSuspicious: boolean;
  flags: FraudFlag[];
  riskScore: number;
  checksRun: string[];
}

export interface FraudCheckOptions {
  userId: string;
  description: string;
  title?: string;
  mediaType?: string;
  mediaUrl?: string;
  imageAnalysis?: {
    description?: string;
    hazards?: string[];
    severity_indicator?: string;
  };
  transcript?: string;
  latitude?: number | null;
  longitude?: number | null;
  barangayId?: string | null;
  barangayName?: string;
}

// resources/js/pages/user/lab-reviews/components/types.ts

import { LabResultStatus } from "../lab-reviews-data";

export interface Parameter {
  name: string;
  result: string;
  unit: string;
  refRange: string;
  status: "normal" | "abnormal";
}

export interface LabResultDetail {
  id: string;
  name: string;
  test: string;
  timeAgo: string;
  status: LabResultStatus;
  patientId: string;
  testParameters: Parameter[];
  interpretation: string;
}
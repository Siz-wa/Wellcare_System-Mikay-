// resources/js/pages/doctor/lab-reviews/components/type.ts

import type { LabResultStatus } from '../lab-reviews-data';

export interface Parameter {
    name: string;
    result: string;
    unit: string;
    refRange: string;
    status: 'normal' | 'abnormal';
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

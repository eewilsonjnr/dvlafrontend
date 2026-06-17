import type { PermissionName } from "@/lib/permissions";

export type OfficeType = "HEAD_OFFICE" | "REGIONAL_CENTRE" | "DISTRICT_OFFICE";

export interface DvlaOffice {
  id: string;
  name: string;
  type: OfficeType;
  regionName?: string;
  town?: string;
  address?: string;
  phone?: string;
  placeOfIssueLabel?: string;
  printerName?: string;
  isActive: boolean;
  parentOfficeId?: string;
  parentOffice?: Pick<DvlaOffice, "id" | "name" | "type">;
  childOffices?: DvlaOffice[];
  _count?: { adminUsers: number; permits: number };
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dvlaRole: string;
  role: string;
  permissions: PermissionName[];
  officeId: string | null;
  office?: Pick<DvlaOffice, "id" | "name" | "type" | "regionName" | "town"> | null;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export interface Applicant {
  id: string;
  surname: string;
  otherNames: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  nationalId?: string;
  licenceNumber?: string;
  photoUrl?: string;
  signatureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permit {
  id: string;
  permitType: "IDP" | "ICMV";
  referenceNumber: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "printed" | "issued";
  applicantId: string;
  applicant?: Applicant;
  operatorId?: string;
  officeId?: string | null;
  issuingOffice?: Pick<DvlaOffice, "id" | "name" | "type" | "regionName" | "town" | "placeOfIssueLabel"> | null;
  rejectionReason?: string;

  // IDP fields
  placeOfIssue?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  classOfLicence?: string;
  certificateOfCompetence?: string;

  // ICMV fields
  ownerSurname?: string;
  ownerOtherNames?: string;
  ownerHomeAddress?: string;
  classOfVehicle?: string;
  makerOfChassis?: string;
  typeOfChassis?: string;
  serialNumber?: string;
  numberOfCylinders?: string;
  engineNumber?: string;
  stroke?: string;
  bore?: string;
  horsePower?: string;
  bodyShape?: string;
  bodyColour?: string;
  numberOfSeats?: string;
  weightUnladen?: string;
  weightLaden?: string;
  identificationMark?: string;

  // MRZ
  mrzLine1?: string;
  mrzLine2?: string;

  // Booklet
  bookletNumber?: string;

  createdAt: string;
  updatedAt: string;
}

export interface PrintJob {
  id: string;
  permitId: string;
  permit?: Permit;
  operatorId: string;
  status: "queued" | "printing" | "complete" | "error";
  printerName?: string;
  isReprint: boolean;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RfidEncoding {
  id: string;
  permitId: string;
  permit?: Permit;
  printJobId?: string;
  status: "pending" | "encoded" | "failed";
  chipSerialNumber?: string;
  verificationResult: "pass" | "fail" | "not_verified";
  verificationDetails?: string;
  encodedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QcResult {
  id: string;
  permitId: string;
  permit?: Permit;
  printJobId?: string;
  result: "pass" | "fail" | "pending";
  rejectionReason?: string;
  opticalInspectionScore?: number;
  photoQualityScore?: number;
  mrzValidation: boolean;
  rfidValidation: boolean;
  inspectedById?: string;
  inspectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  operatorName?: string;
  applicantRef?: string;
  action: string;
  outcome: "success" | "failure" | "warning";
  details?: string;
  ipAddress?: string;
  hash?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: { id: string; name: string; description?: string }[];
  createdAt: string;
}

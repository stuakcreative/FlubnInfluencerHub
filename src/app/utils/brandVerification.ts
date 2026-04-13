/**
 * Brand Verification Utility
 * Manages brand identity verification via government registration numbers.
 * Supports Indian companies (GST/PAN/CIN/MSME/LLP) and foreign companies.
 * All data stored in localStorage under "flubn_brand_verifications" and synced to backend.
 */
import * as api from "./api";

export type VerificationStatus = "not_started" | "pending" | "verified" | "rejected";

export type CompanyType =
  | "gst"
  | "pan"
  | "cin"
  | "msme"
  | "llp"
  | "foreign_reg"
  | "foreign_tax"
  | "foreign_vat";

export interface CompanyTypeOption {
  value: CompanyType;
  label: string;
  placeholder: string;
  hint: string;
  verifyUrl: string;
  group: "india" | "foreign";
}

export const COMPANY_TYPE_OPTIONS: CompanyTypeOption[] = [
  {
    value: "gst",
    label: "GST Number",
    placeholder: "e.g. 22AAAAA0000A1Z5",
    hint: "15-character GSTIN — most common for Indian businesses",
    verifyUrl: "https://www.gst.gov.in/searchtaxpayer",
    group: "india",
  },
  {
    value: "pan",
    label: "PAN Number",
    placeholder: "e.g. AABCN1234M",
    hint: "10-character Permanent Account Number issued by Income Tax Dept",
    verifyUrl: "https://www.incometax.gov.in/iec/foportal/",
    group: "india",
  },
  {
    value: "cin",
    label: "CIN — Company Identification Number",
    placeholder: "e.g. U74999MH2010PTC123456",
    hint: "21-character CIN issued by Ministry of Corporate Affairs",
    verifyUrl: "https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do",
    group: "india",
  },
  {
    value: "msme",
    label: "MSME / Udyam Registration",
    placeholder: "e.g. UDYAM-MH-12-0012345",
    hint: "Udyam Registration Certificate number for small & medium enterprises",
    verifyUrl: "https://udyamregistration.gov.in/",
    group: "india",
  },
  {
    value: "llp",
    label: "LLP Identification Number",
    placeholder: "e.g. AAB-0123",
    hint: "LLP Identification Number from Ministry of Corporate Affairs",
    verifyUrl: "https://www.mca.gov.in/mcafoportal/viewLLPMasterData.do",
    group: "india",
  },
  {
    value: "foreign_reg",
    label: "Company Registration Number (Foreign)",
    placeholder: "e.g. 12345678",
    hint: "Official company registration number from your country's business registry",
    verifyUrl: "",
    group: "foreign",
  },
  {
    value: "foreign_tax",
    label: "Tax ID / EIN (Foreign)",
    placeholder: "e.g. 12-3456789",
    hint: "Federal Tax ID, EIN, or equivalent from your country's tax authority",
    verifyUrl: "",
    group: "foreign",
  },
  {
    value: "foreign_vat",
    label: "VAT Number (EU / UK / International)",
    placeholder: "e.g. GB123456789",
    hint: "VAT registration number — verifiable on EU VIES or UK HMRC portal",
    verifyUrl: "https://ec.europa.eu/taxation_customs/vies/",
    group: "foreign",
  },
];

export interface BrandVerificationData {
  brandId: string;
  brandName: string;
  brandEmail: string;
  companyType: CompanyType;
  registrationNumber: string;
  submittedAt: string; // ISO timestamp
  status: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
}

const STORAGE_KEY = "flubn_brand_verifications";

// No mock data seeding — all verification data is created via real brand submissions

// ── CRUD helpers ───────────────────────────────────────────────────────────────

export function getAllVerifications(): BrandVerificationData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllVerifications(data: BrandVerificationData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
  // Sync to backend
  api.saveAllVerifications(data).catch((err) => {
    if (!err.message?.includes("Failed to fetch") && !err.message?.includes("NetworkError") && !err.message?.includes("Load failed")) {
      console.error("Brand verification sync error:", err.message);
    }
  });
}

export function getVerificationByBrandId(brandId: string): BrandVerificationData | null {
  return getAllVerifications().find((v) => v.brandId === brandId) || null;
}

export function submitVerification(
  brandId: string,
  brandName: string,
  brandEmail: string,
  companyType: CompanyType,
  registrationNumber: string
): BrandVerificationData {
  const all = getAllVerifications();
  const existingIdx = all.findIndex((v) => v.brandId === brandId);

  const entry: BrandVerificationData = {
    brandId,
    brandName,
    brandEmail,
    companyType,
    registrationNumber: registrationNumber.trim().toUpperCase(),
    submittedAt: new Date().toISOString(),
    status: "pending",
    // Clear previous rejection data on resubmit
    rejectedAt: undefined,
    rejectionReason: undefined,
    verifiedAt: undefined,
    verifiedBy: undefined,
  };

  if (existingIdx >= 0) {
    all[existingIdx] = entry;
  } else {
    all.push(entry);
  }

  saveAllVerifications(all);
  return entry;
}

export function approveVerification(
  brandId: string,
  adminName: string,
  adminNotes?: string
): boolean {
  const all = getAllVerifications();
  const idx = all.findIndex((v) => v.brandId === brandId);
  if (idx < 0) return false;

  all[idx] = {
    ...all[idx],
    status: "verified",
    verifiedAt: new Date().toISOString(),
    verifiedBy: adminName,
    adminNotes: adminNotes || undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
  };

  saveAllVerifications(all);
  return true;
}

export function rejectVerification(brandId: string, reason: string): boolean {
  const all = getAllVerifications();
  const idx = all.findIndex((v) => v.brandId === brandId);
  if (idx < 0) return false;

  all[idx] = {
    ...all[idx],
    status: "rejected",
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
    verifiedAt: undefined,
    verifiedBy: undefined,
  };

  saveAllVerifications(all);
  return true;
}

export function isBrandVerified(brandId: string): boolean {
  return getVerificationByBrandId(brandId)?.status === "verified";
}

export function getCompanyTypeOption(value: CompanyType): CompanyTypeOption | undefined {
  return COMPANY_TYPE_OPTIONS.find((o) => o.value === value);
}

export function formatVerifDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ── Custom Verify URLs (admin-editable) ───────────────────────────────────────

const VERIFY_URLS_KEY = "flubn_verify_urls";

export type VerifyUrlMap = Partial<Record<CompanyType, string>>;

export function getCustomVerifyUrls(): VerifyUrlMap {
  try {
    const raw = localStorage.getItem(VERIFY_URLS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomVerifyUrls(urls: VerifyUrlMap): void {
  try {
    localStorage.setItem(VERIFY_URLS_KEY, JSON.stringify(urls));
  } catch { /* ignore */ }
  // Sync to backend
  api.saveSettings("verify_urls", urls).catch(() => {});
}

export function getVerifyUrl(companyType: CompanyType): string {
  const custom = getCustomVerifyUrls();
  if (custom[companyType] !== undefined) return custom[companyType] as string;
  return getCompanyTypeOption(companyType)?.verifyUrl ?? "";
}

export function resetVerifyUrl(companyType: CompanyType): void {
  const custom = getCustomVerifyUrls();
  delete custom[companyType];
  saveCustomVerifyUrls(custom);
}
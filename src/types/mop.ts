export type TSSRFormatType = 'ONE_TSSR' | 'ERICSSON_FTTH' | 'AUTO_DETECT';

export type TappingMode =
  | 'Single Tapping Point'
  | 'Main + RDNT – Same Rectifier'
  | 'Main + RDNT – Separate Rectifiers';

export interface RectifierEntry {
  name: string; // e.g. "Eltek Flatpack 1"
  load: string; // e.g. "F8" (Fuse No.)
  ampere: string; // e.g. "10A" or "16A"
  rdnt_load: string; // e.g. "F9"
  rdnt_ampere: string; // e.g. "10A"
  load_img_dataUrl?: string; // base64 dataUrl (primary/first photo)
  existing_img_dataUrl?: string; // base64 dataUrl (primary/first photo)
  load_images?: string[]; // array of base64 dataUrls (supports multiple photos)
  existing_images?: string[]; // array of base64 dataUrls (supports multiple photos)
}

export interface AdditionalPhoto {
  id: string;
  title: string;
  dataUrl: string;
}

export interface OfficialMopSpecs {
  format: 'ONE_TSSR' | 'ERICSSON_FTTH';
  // General Information (First Page TSSR detection)
  site_name: string; // e.g. "PAGATPATCDOMISOR" or "KIMADZILCARMENCOT"
  plaid: string; // e.g. "MIN2250" or "MIN2183"
  equipment: string; // e.g. "Nokia Lightspan MF-2" or "Nokia Lightspan DF-16M"
  olt_label_custom: string; // e.g. "OLT MF-2"
  prepared_by: string; // e.g. "John Carlo Rabanes"
  position: string; // e.g. "OLT Rollout Engineer"
  target_datetime: string; // e.g. "May 19- June 19, 2026 10:00AM-6:00PM"

  // First Page TSSR Metadata
  solution?: string; // e.g. "MF2 – 1 CARD"
  project?: string; // e.g. "FTTH HORIZONTAL"
  scope?: string; // e.g. "NEW BUILD"
  territory?: string; // e.g. "T7"
  region?: string; // e.g. "MINDANAO"
  siteAddress?: string; // e.g. "CARMEN, COTABATO (NORTH COTABATO)"
  towerco?: string; // e.g. "PHILTOWER"

  // Power Tapping Configuration
  total_rectifiers: 1 | 2;
  tapping_mode: TappingMode;
  detected_2_rs?: boolean; // Set true when TSSR analysis detected 2 RS on site
  rs_detection_notes?: string; // Explanation of what was detected in TSSR

  // RS1 and RS2 Rectifier Details & Images
  rs_entries: RectifierEntry[];

  // TSSR Approver Remarks Photos on Tapping Point Section
  approver_remarks_images?: string[]; // base64 dataUrls (supports multiple photos)

  // Additional Photo Attachments whenever necessary
  additional_photos?: AdditionalPhoto[];

  // Supporting Document
  tssrFileName: string;
  generatedMopFileName: string;
  tssrFileDataUrl?: string; // base64 dataUrl of the attached TSSR PDF file
  tssrFileSize?: number; // size in bytes of the attached TSSR file

  // Full MOP sections & preview fields
  siteId?: string;
  siteName?: string;
  mopVersion?: string;
  revisionDetail?: string;
  author?: string;
  approvedBy?: string;
  dateApproved?: string;
  equipmentModel?: string;
  rectifierSystem?: string;
  fuseMain?: string;
  fuseRedundant?: string;
  fuseAmperage?: string;
  projectName?: string;
  proponents?: Array<{ name: string; position: string; deptDiv: string }>;
  approvers?: Array<{ name: string; role: string }>;
  targetImplementationDates?: string;
  changeCategory?: string;
  serviceAffected?: string;
  siteLocationSystem?: string;
  systemE2E?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  peopleInvolved?: Array<{ company: string; department: string; name: string; role: string; contactNumber?: string }>;
  escalationProcedure?: Array<{ company: string; department: string; name: string; role: string; contactNumber?: string }>;
  schedule?: Array<{ startTime: string; endTime: string; activity: string; responsible: string; remarks: string }>;
  risks?: string[];
  mitigations?: string[];
  successCriteria?: string[];
  abortCriteria?: string[];
  revertCriteria?: string[];
  preActivityProcedures?: string[];
  plannedProcedures?: string[];
  postActivityProcedures?: string[];
  revertProcedures?: string[];
}

export type TSSRTechnicalSpecs = OfficialMopSpecs;

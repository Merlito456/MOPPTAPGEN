import type { OfficialMopSpecs } from '../types/mop';

export const SAMPLE_ONE_TSSR: OfficialMopSpecs = {
  format: 'ONE_TSSR',
  mopVersion: '1.0',
  revisionDetail: '1st DRAFT',
  author: 'John Carlo Rabanes',
  approvedBy: 'Dhenver Santos',
  dateApproved: 'Pending Implementation',

  site_name: 'PAGATPATCDOMISOR',
  plaid: 'MIN2250',
  equipment: 'Nokia Lightspan MF-2',
  olt_label_custom: '',
  prepared_by: 'John Carlo Rabanes',
  position: 'OLT Rollout Engineer',
  target_datetime: 'May 19- June 19, 2026 10:00AM-6:00PM',
  total_rectifiers: 1,
  tapping_mode: 'Main + RDNT – Same Rectifier',
  rs_entries: [
    {
      name: 'Eltek Flatpack 1',
      load: 'F1',
      ampere: '16A',
      rdnt_load: 'F2',
      rdnt_ampere: '16A',
    },
  ],
  approver_remarks_images: [],

  tssrFileName: 'MIN2250_PAGATPATCDOMISOR_ONE_TSSR_09-15-26_1_1_01 (1).pdf',
  generatedMopFileName: 'MOP_PAGATPATCDOMISOR_MIN2250.docx',

  siteId: 'MIN2250',
  siteName: 'PAGATPATCDOMISOR',
  equipmentModel: 'Nokia Lightspan MF-2',
  rectifierSystem: 'RECTIFIER 1 – ELTEK',
  fuseMain: 'F1',
  fuseRedundant: 'F2',
  fuseAmperage: '16A',
  projectName: 'Blaine Plus Project for additional OLT GPON/VOICE deployment of Nokia OLT MF-2 equipment for the Globe Project',

  proponents: [
    { name: 'Dhenver Santos', position: 'Technical Team Head', deptDiv: 'Nokia / OLT MF-2' },
    { name: 'Edgar Peralta', position: 'OLT Supervisor', deptDiv: 'Nokia / OLT MF-2' },
    { name: 'John Carlo Rabanes', position: 'OLT Rollout Engineer', deptDiv: 'Nokia / OLT MF-2' },
  ],
  approvers: [
    { name: 'Kristy Mae Dela Torre', role: 'Minor – Section Head Approval' },
    { name: 'Butch Doble', role: 'Major / Critical – Department / Division Head' },
  ],
  targetImplementationDates: 'May 19 - June 19, 2026 10:00AM-6:00PM',
  changeCategory: 'Minor',
  serviceAffected: '(None Service Affecting)',

  siteLocationSystem: 'PAGATPATCDOMISOR_MIN2250',
  systemE2E: 'OLT MF-2',
  hardwareVersion: 'L6GQFC24.298',
  softwareVersion: 'L6GQFC24.298',

  peopleInvolved: [
    { company: 'Nokia', department: 'FN Access Project', name: 'Edgar Peralta Jr.', role: 'Engineer / implementer', contactNumber: '+63 9260895345' },
    { company: 'Nokia', department: 'FN Access Project', name: 'Jay Palasol', role: 'Engineer / implementer', contactNumber: '+63 9175520623' },
    { company: 'Nokia', department: 'FN Access Project', name: 'Mark Inovero', role: 'Engineer / implementer', contactNumber: '+63 9354376033' },
    { company: 'Nokia', department: 'FN Access Project', name: 'Mark Brillantes', role: 'Engineer / implementer', contactNumber: '+63 9562570282' },
    { company: 'Nokia', department: 'FN Access Project', name: 'John Carlo Rabanes', role: 'Engineer / implementer', contactNumber: '+63 9669343065' },
  ],
  escalationProcedure: [
    { company: 'Globe', department: 'Engineering', name: 'Kristy Mae Dela Torre', role: 'Lead Facilities Engineer' },
    { company: 'Globe', department: 'Engineering', name: 'Edward Ian Oria', role: 'Operations & Engineering' },
    { company: 'Globe', department: 'Implement Engineering', name: 'LA Tan (SICE)', role: 'Implementation Lead', contactNumber: '+63 9178382974' },
  ],

  schedule: [
    { startTime: '09:00', endTime: '10:15', activity: 'Pre-activity procedure (Toolbox meeting, site inspection, permit validation)', responsible: 'FAPE/ Nokia Engineer', remarks: 'Check NMS alarms' },
    { startTime: '10:15', endTime: '12:30', activity: 'Activity Proper (Power tapping of DC cables to breakers F1/F2 on Eltek rectifier)', responsible: 'Nokia Engineer', remarks: 'Zero-voltage & polarity verification' },
    { startTime: '12:30', endTime: '18:00', activity: 'Post-activity procedure (LED check, NMS alarm clearance, housekeeping, sign-off)', responsible: 'FAPE/ Nokia Engineer', remarks: 'Complete validation' },
  ],

  risks: ['Power cables & DC Breakers are faulty', 'Short circuit during live tapping on distribution panel'],
  mitigations: ['Insulation testing should be done prior activity', 'Spare breaker should be available', 'Power cable route are inspected prior activity', 'Appropriate terminal lugs and insulated tools only'],
  successCriteria: ['OLT MF-2 is powered-on without interruption.', 'No alarms are observed during the activity.', 'AMS server and Switch power LEDs normal green.'],
  abortCriteria: ['There are existing faults in rectifier or DCDU.', 'Input voltage from rectifier is unstable or out of -48Vdc spec.'],
  revertCriteria: ['Unexpected outage occurred on GAIN network caused by the activity. (Please call Proponent first before revert to verify).'],

  preActivityProcedures: [
    'SCC Wireline to check and validate existing alarms on NMS.',
    'Visual inspection of power cables (labels, breakers, rectifier loadings, etc.).',
    'Assistance from Globe proponent/Facilities for checking of rectifier and PDF status.',
  ],
  plannedProcedures: [
    '1. Align the breaker assignment as follows:',
    '   - Fuse F1 (16A) : Nokia Lightspan MF-2 Power Tapped – MAIN [ELTEK]',
    '   - Fuse F2 (16A) : Nokia Lightspan MF-2 Power Tapped – RDNT [ELTEK]',
    '   - RECTIFIER 1 – ELTEK (MAIN: F1 / RDNT: F2)',
    'A. Tap the power cables on the PDF breakers with respect to equipment power modules.',
    'Make sure power tapping of the breaker is for the terminals of the equipment. Also the breaker should be switched off prior to the tapping of cable/s.',
    'One by one, tap the cable/s to their respective breakers. Be sure not to cause any short circuit in the cables being tapped or any other cables in the power panel. Make sure that the cable/s is properly terminated to their terminals (with the appropriate terminal lugs) and all terminations are properly tightened.',
    'Apply the corresponding label after the said activity.',
  ],
  postActivityProcedures: [
    'NOC Wireline to check and validate existing alarms on NMS.',
    'Visual inspection of power cables (labels, breakers, rectifier loadings, etc.).',
    'Assistance from Globe proponent/Facilities for checking of rectifier and PDF status.',
    'Visual inspection of AMS server power LED.',
    'Visual inspection of SWITCH power LED.',
  ],
  revertProcedures: [
    'In case of revert, power off the breakers immediately.',
    'Contact GT proponent / Nokia proponent (refer to escalation procedure).',
  ],
};

export const SAMPLE_ERICSSON_FTTH: OfficialMopSpecs = {
  format: 'ERICSSON_FTTH',
  mopVersion: '1.0',
  revisionDetail: '1st DRAFT',
  author: 'John Carlo Rabanes',
  approvedBy: 'Dhenver Santos',
  dateApproved: 'Pending Implementation',

  site_name: 'KIMADZILCARMENCOT',
  plaid: 'MIN2183',
  equipment: 'Nokia Lightspan MF-2',
  olt_label_custom: 'OLT MF-2',
  prepared_by: 'John Carlo Rabanes',
  position: 'OLT Rollout Engineer',
  target_datetime: 'November 9 - December 9, 2026 08:00AM-08:00PM',
  total_rectifiers: 1,
  tapping_mode: 'Main + RDNT – Same Rectifier',

  solution: 'MF2 – 1 CARD',
  project: 'FTTH HORIZONTAL',
  scope: 'NEW BUILD',
  territory: 'T7',
  region: 'MINDANAO',
  siteAddress: 'CARMEN, COTABATO (NORTH COTABATO)',
  towerco: 'PHILTOWER',

  rs_entries: [
    {
      name: 'Eltek Flatpack 1',
      load: 'F16',
      ampere: '16A',
      rdnt_load: 'F17',
      rdnt_ampere: '16A',
    },
  ],
  approver_remarks_images: [],

  tssrFileName: 'NOKIA_FTTH HORIZONTAL_KIMADZILCARMENCOT_MIN2183_TSSR .pdf',
  generatedMopFileName: 'MOP_POWERTAPPING_FTTH_HORIZONTAL_T7_KIMADZILCARMENCOT_MIN2183.docx',

  siteId: 'MIN2183',
  siteName: 'KIMADZILCARMENCOT',
  equipmentModel: 'Nokia Lightspan MF-2',
  rectifierSystem: 'RECTIFIER 1 – ELTEK',
  fuseMain: 'F16',
  fuseRedundant: 'F17',
  fuseAmperage: '16A',
  projectName: 'Blaine Plus Project for additional OLT GPON/VOICE deployment of Nokia Lightspan MF-2 equipment for the Globe Project',

  proponents: [
    { name: 'Dhenver Santos', position: 'Technical Team Head', deptDiv: 'Nokia / Nokia Lightspan MF-2' },
    { name: 'Edgar Peralta', position: 'OLT Supervisor', deptDiv: 'Nokia / Nokia Lightspan MF-2' },
    { name: 'John Carlo Rabanes', position: 'OLT Rollout Engineer', deptDiv: 'Nokia / Nokia Lightspan MF-2' },
  ],
  approvers: [
    { name: 'Kristy Mae Dela Torre', role: 'Minor – Section Head Approval' },
    { name: 'Liam Walter Meflores', role: 'Major / Critical – Department / Division Head' },
  ],
  targetImplementationDates: 'November 9 - December 9, 2026 08:00AM-08:00PM',
  changeCategory: 'Minor',
  serviceAffected: '(None Service Affecting)',

  siteLocationSystem: 'KIMADZILCARMENCOT_MIN2183',
  systemE2E: 'Nokia Lightspan DF-16M',
  hardwareVersion: 'L6GQFC24.298',
  softwareVersion: 'L6GQFC24.298',

  peopleInvolved: [
    { company: 'Nokia', department: 'FN Access Project', name: 'Edgar Peralta Jr.', role: 'Engineer / implementer', contactNumber: '+63 9260895345' },
    { company: 'Nokia', department: 'FN Access Project', name: 'Jay Palasol', role: 'Engineer / implementer', contactNumber: '+63 9175520623' },
    { company: 'Nokia', department: 'FN Access Project', name: 'Mark Inovero', role: 'Engineer / implementer', contactNumber: '+63 9354376033' },
    { company: 'Nokia', department: 'FN Access Project', name: 'Mark Brillantes', role: 'Engineer / implementer', contactNumber: '+63 9562570282' },
    { company: 'Nokia', department: 'FN Access Project', name: 'John Carlo Rabanes', role: 'Engineer / implementer', contactNumber: '+63 9669343065' },
  ],
  escalationProcedure: [
    { company: 'Globe', department: 'Engineering', name: 'Kristy Mae Dela Torre', role: 'Lead Facilities Engineer' },
    { company: 'Globe', department: 'Engineering', name: 'Liam Walter Meflores', role: 'Operations & Engineering Lead' },
    { company: 'Globe', department: 'Implement Engineering', name: 'LA Tan (SICE)', role: 'Implementation Lead', contactNumber: '+63 9178382974' },
  ],

  schedule: [
    { startTime: '08:00', endTime: '09:30', activity: 'Pre-activity procedure (Toolbox meeting, site inspection, permit validation)', responsible: 'FAPE/ Nokia Engineer', remarks: 'Check NMS alarms' },
    { startTime: '09:30', endTime: '13:00', activity: 'Activity Proper (Power tapping of DC cables to breakers F16/F17 on Eltek rectifier)', responsible: 'Nokia Engineer', remarks: 'Zero-voltage & polarity verification' },
    { startTime: '13:00', endTime: '20:00', activity: 'Post-activity procedure (LED check, NMS alarm clearance, housekeeping, sign-off)', responsible: 'FAPE/ Nokia Engineer', remarks: 'Complete validation' },
  ],

  risks: ['Power cables & DC Breakers are faulty', 'Short circuit during live tapping on distribution panel'],
  mitigations: ['Insulation testing should be done prior activity', 'Spare breaker should be available', 'Power cable route are inspected prior activity', 'Appropriate terminal lugs and insulated tools only'],
  successCriteria: ['Nokia Lightspan DF-16M is powered-on without interruption.', 'No alarms are observed during the activity.'],
  abortCriteria: ['There are existing faults in rectifier or DCDU.'],
  revertCriteria: ['Unexpected outage occurred on GAIN network caused by the activity. (Please call Proponent first before revert to verify).'],

  preActivityProcedures: [
    'SCC Wireline to check and validate existing alarms on NMS.',
    'Visual inspection of power cables (labels, breakers, rectifier loadings, etc.).',
    'Assistance from Globe proponent/Facilities for checking of rectifier and PDF status.',
  ],
  plannedProcedures: [
    '1. Align the breaker assignment as follows:',
    '   - Fuse F16 (16A) : Nokia Lightspan DF-16M Power Tapped – MAIN [ELTEK]',
    '   - Fuse F17 (16A) : Nokia Lightspan DF-16M Power Tapped – RDNT [ELTEK]',
    '   - RECTIFIER 1 – ELTEK (MAIN: F16 / RDNT: F17)',
    'A. Tap the power cables on the PDF breakers with respect to equipment power modules.',
    'Make sure power tapping of the breaker is for the terminals of the equipment. Also the breaker should be switched off prior to the tapping of cable/s.',
    'One by one, tap the cable/s to their respective breakers. Be sure not to cause any short circuit in the cables being tapped or any other cables in the power panel. Make sure that the cable/s is properly terminated to their terminals (with the appropriate terminal lugs) and all terminations are properly tightened.',
    'Apply the corresponding label after the said activity.',
  ],
  postActivityProcedures: [
    'NOC Wireline to check and validate existing alarms on NMS.',
    'Visual inspection of power cables (labels, breakers, rectifier loadings, etc.).',
    'Assistance from Globe proponent/Facilities for checking of rectifier and PDF status.',
    'Visual inspection of AMS server power LED.',
    'Visual inspection of SWITCH power LED.',
  ],
  revertProcedures: [
    'In case of revert, power off the breakers immediately.',
    'Contact GT proponent / Nokia proponent (refer to escalation procedure).',
  ],
};

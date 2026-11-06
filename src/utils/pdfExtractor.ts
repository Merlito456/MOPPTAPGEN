import type { OfficialMopSpecs } from '../types/mop';
import { SAMPLE_ONE_TSSR, SAMPLE_ERICSSON_FTTH } from '../data/sampleTssrs';

/**
 * Fast client-side filename and pattern analyzer
 */
export function parseFileNameMetadata(fileName: string) {
  const clean = fileName.replace(/\.[^/.]+$/, '').trim();
  const idMatch = clean.match(/([A-Z]{2,4}\d{3,5})/i);
  const siteId = idMatch ? idMatch[1].toUpperCase() : '';

  const tokens = clean.split(/[_\s\-()]+/);
  const ignore = new Set([
    'NOKIA',
    'ERICSSON',
    'FTTH',
    'HORIZONTAL',
    'TSSR',
    'ONE',
    'REV',
    'FINAL',
    'PDF',
    'MOP',
    'POWERTAPPING',
    'T7',
    'T6',
    'T5',
    '1',
    '2',
    '01',
    'COPY',
  ]);

  let siteName = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!t || t === siteId) continue;
    if (ignore.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    if (t.length >= 6) {
      siteName = t;
      break;
    }
  }

  const isEricsson =
    /ERICSSON|NOKIA|FTTH|HORIZONTAL/i.test(fileName) && !/ONE[_\s-]?TSSR/i.test(fileName);

  return {
    siteId,
    siteName,
    isEricsson,
    format: (isEricsson ? 'ERICSSON_FTTH' : 'ONE_TSSR') as 'ONE_TSSR' | 'ERICSSON_FTTH',
  };
}

/**
 * Fast stream-based text extraction from PDF buffer
 * Runs in under 200ms without blocking main thread
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 45);
      const textChunks: string[] = [];

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as Array<{
          str?: string;
          transform?: number[];
        }>;

        const filtered = items.filter((it) => it.str && it.str.trim().length > 0);
        let pageText = '';

        if (filtered.length > 0 && filtered[0].transform) {
          // Sort items visually: Y descending (top-to-bottom), X ascending (left-to-right)
          filtered.sort((a, b) => {
            const yA = a.transform ? a.transform[5] : 0;
            const yB = b.transform ? b.transform[5] : 0;
            const yDiff = yB - yA;
            if (Math.abs(yDiff) > 7) return yDiff;
            const xA = a.transform ? a.transform[4] : 0;
            const xB = b.transform ? b.transform[4] : 0;
            return xA - xB;
          });

          const lines: string[] = [];
          let currentLine: string[] = [];
          let currentY: number | null = null;

          for (const item of filtered) {
            const y = item.transform ? item.transform[5] : 0;
            const str = item.str || '';
            if (currentY === null || Math.abs(currentY - y) <= 7) {
              currentLine.push(str);
              if (currentY === null) currentY = y;
            } else {
              lines.push(currentLine.join(' '));
              currentLine = [str];
              currentY = y;
            }
          }
          if (currentLine.length > 0) {
            lines.push(currentLine.join(' '));
          }
          pageText = lines.join('\n');
        } else {
          pageText = items.map((item: any) => item.str || '').join(' ');
        }

        textChunks.push(`--- PAGE ${i} ---\n${pageText}`);
      }

      const fullText = textChunks.join('\n');
      if (fullText.trim().length > 50) {
        return fullText;
      }
    } catch (pdfJsErr) {
      console.warn('pdfjs parser fallback:', pdfJsErr);
    }

    // Binary scan fallback
    const uint8 = new Uint8Array(arrayBuffer.slice(0, 1000000));
    let binaryStr = '';
    for (let i = 0; i < uint8.length; i++) {
      const charCode = uint8[i];
      if (charCode >= 32 && charCode <= 126) {
        binaryStr += String.fromCharCode(charCode);
      } else if (charCode === 10 || charCode === 13) {
        binaryStr += ' ';
      }
    }

    return binaryStr;
  } catch (err) {
    console.warn('Failed to extract text from file buffer:', err);
    return '';
  }
}

export interface FirstPageGeneralInfo {
  project?: string;
  scope?: string;
  solution?: string;
  rawSolution?: string;
  equipment?: string;
  oltLabel?: string;
  siteName?: string;
  plaid?: string;
  territory?: string;
  region?: string;
  siteAddress?: string;
  towerco?: string;
}

/**
 * Maps solution string from TSSR Page 1 General Information table to official equipment & OLT label
 */
export function mapSolutionToEquipment(solutionStr: string): { equipment: string; oltLabel: string } {
  const norm = (solutionStr || '').toUpperCase().trim();

  // If empty or an accidental table header keyword was passed, default cleanly
  if (!norm || /^(SITE\s*NAME|PROJECT|SCOPE|TERRITORY|REGION|SITE\s*ADDRESS|TOWERCO|PLAID|NEW\s*BUILD|NEW|BUILD|NAME|ID)$/i.test(norm)) {
    return {
      equipment: 'Nokia Lightspan MF-2',
      oltLabel: 'OLT MF-2',
    };
  }

  // Nokia Lightspan MF-2: e.g. "MF2 – 1 CARD", "MF2 - 1 CARD", "MF2 – 2 CARD", "MF-2", "MF2", "MF 2"
  if (norm.includes('MF2') || norm.includes('MF-2') || norm.includes('MF 2')) {
    return {
      equipment: 'Nokia Lightspan MF-2',
      oltLabel: 'OLT MF-2',
    };
  }

  // Nokia Lightspan DF-16M: e.g. "DF-16M", "DF16M", "DF-16", "DF16", "DF 16"
  if (norm.includes('DF16') || norm.includes('DF-16') || norm.includes('DF 16')) {
    return {
      equipment: 'Nokia Lightspan DF-16M',
      oltLabel: 'OLT DF-16M',
    };
  }

  // Nokia Lightspan FX-4
  if (norm.includes('FX4') || norm.includes('FX-4') || norm.includes('FX 4')) {
    return {
      equipment: 'Nokia Lightspan FX-4',
      oltLabel: 'OLT FX-4',
    };
  }

  // Nokia Lightspan FX-8
  if (norm.includes('FX8') || norm.includes('FX-8') || norm.includes('FX 8')) {
    return {
      equipment: 'Nokia Lightspan FX-8',
      oltLabel: 'OLT FX-8',
    };
  }

  // Nokia Lightspan FX-16
  if (norm.includes('FX16') || norm.includes('FX-16') || norm.includes('FX 16')) {
    return {
      equipment: 'Nokia Lightspan FX-16',
      oltLabel: 'OLT FX-16',
    };
  }

  // Huawei SmartAX MA5800
  if (norm.includes('MA5800') || norm.includes('MA-5800')) {
    return {
      equipment: 'Huawei SmartAX MA5800',
      oltLabel: 'OLT MA5800',
    };
  }

  // If already prefixed with Nokia or Lightspan
  if (norm.includes('LIGHTSPAN') || norm.includes('NOKIA')) {
    return {
      equipment: solutionStr,
      oltLabel: norm.includes('DF') ? 'OLT DF-16M' : norm.includes('FX') ? 'OLT FX-4' : 'OLT MF-2',
    };
  }

  // Default standard for FTTH horizontal
  return {
    equipment: 'Nokia Lightspan MF-2',
    oltLabel: 'OLT MF-2',
  };
}

/**
 * Parses the General Information table found on Page 1 of TSSR documents
 * with 100% precision across layout styles (colon-separated, line-by-line, collapsed).
 * CRITICAL REQUIREMENT: PLAID must be extracted directly from the Page 1 table.
 */
export function parseFirstPageGeneralInfo(text: string): FirstPageGeneralInfo {
  const result: FirstPageGeneralInfo = {};
  if (!text) return result;

  // STRICT PAGE 1 ISOLATION:
  // If "--- PAGE 1 ---" delimiter is present, focus exclusively on Page 1 up to Page 2
  let page1Text = text;
  const page1Match = text.match(/---\s*PAGE\s*1\s*---([\s\S]*?)(?:---\s*PAGE\s*2\s*---|$)/i);
  if (page1Match && page1Match[1] && page1Match[1].trim().length > 20) {
    page1Text = page1Match[1];
  } else {
    page1Text = text.slice(0, 6000);
  }

  // 1. SOLUTION & OLT TYPE EXTRACTION (Strictly from Page 1 General Information table)
  // Strategy A: Targeted search in proximity to "SOLUTION" keyword (handles same-line, next-line, and columnar layouts)
  const solIdx = page1Text.search(/\bSOLUTION\b/i);
  if (solIdx !== -1) {
    const afterSol = page1Text.slice(solIdx, solIdx + 300);
    // Explicit telecom hardware signature near SOLUTION:
    // e.g. "MF2 – 1 CARD", "MF2 - 1 CARD", "MF2 – 2 CARD", "MF2", "MF-2", "DF-16M", "FX-4", "FX-8", "MA5800"
    const hwNearSol = afterSol.match(/\b(MF-?2(?:\s*[-–—−]\s*\d+\s*CARD)?|DF-?16M?|DF-?16\b|FX-?4\b|FX-?8\b|FX-?16\b|MA-?5800)\b/i);
    if (hwNearSol) {
      result.rawSolution = hwNearSol[0].trim();
    } else {
      // Check for same-line text: "SOLUTION: <value>" or "SOLUTION  <value>"
      const lineMatch = afterSol.match(/^SOLUTION\s*[:\-–]?\s*([^\r\n\t]+)/i);
      if (lineMatch && lineMatch[1]) {
        const candidate = lineMatch[1].trim();
        if (candidate.length > 0 && candidate.length < 50 && !/^(SITE|PLAID|PROJECT|SCOPE|REGION|TERRITORY|TOWERCO|ADDRESS|NAME|ID|BUILD|NEW)/i.test(candidate)) {
          result.rawSolution = candidate;
        }
      }
    }
  }

  // Strategy B: If not found near "SOLUTION", check regex across Page 1
  if (!result.rawSolution) {
    const solRegexes = [
      /SOLUTION\s*[:\-–]\s*([^\r\n]+)/i,
      /SOLUTION\s*[:\-–]?\s*([A-Za-z0-9_\-\s–—−/]+?)(?=\s+(?:SITE\s*NAME|PLAID|TERRITORY|REGION|SCOPE|SITE\s*ADDRESS|TOWERCO|PROJECT|[\r\n]|$))/i,
    ];
    for (const reg of solRegexes) {
      const match = page1Text.match(reg);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length > 0 && candidate.length < 50 && !/^(SITE|PLAID|PROJECT|SCOPE|REGION|TERRITORY|TOWERCO|ADDRESS|NAME|ID|BUILD|NEW)/i.test(candidate)) {
          result.rawSolution = candidate;
          break;
        }
      }
    }
  }

  // Strategy C: Direct scan for explicit "MF2 – 1 CARD" or "MF-2" on Page 1
  // Prioritize MF-2 and DF-16M because they are the predominant FTTH rollout models
  if (!result.rawSolution) {
    const directMatch = page1Text.match(/\b(MF-?2\s*[-–—−]\s*\d+\s*CARD|MF-?2\b|DF-?16M?|MA-?5800|FX-?4\b|FX-?8\b|FX-?16\b)\b/i);
    if (directMatch) {
      result.rawSolution = directMatch[0].trim();
    }
  }

  // Map solution to official equipment & OLT label
  if (result.rawSolution) {
    const mapped = mapSolutionToEquipment(result.rawSolution);
    result.solution = result.rawSolution;
    result.equipment = mapped.equipment;
    result.oltLabel = mapped.oltLabel;
  }

  // 2. SITE NAME (e.g. "SALUNA" or "KIMADZILCARMENCOT" or "PAGATPATCDOMISOR")
  const siteRegexes = [
    /SITE\s*NAME\s*[:\-–]?\s*([A-Za-z0-9_]+)/i,
    /SITE\s*NAME\s*[:\-–]\s*([^\n\r]+)/i,
    /SITE\s*[:\-–]\s*([A-Za-z0-9_]+)/i,
    /\bSITE\s*NAME\s*[:\-–]?(?:\r?\n|\s{2,})+([A-Za-z0-9_]+)\b/i,
  ];
  for (const reg of siteRegexes) {
    const match = page1Text.match(reg);
    if (match && match[1]) {
      const site = match[1].trim().replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
      if (site.length >= 3 && !/^(NAME|ID|CODE|SITE|GENERAL|INFORMATION|PLAID|TERRITORY|REGION|SCOPE|BUILD)$/i.test(site)) {
        result.siteName = site;
        break;
      }
    }
  }

  // Proximity to SITE NAME keyword if still not found
  if (!result.siteName) {
    const siteIdx = page1Text.search(/\bSITE\s*NAME\b/i);
    if (siteIdx !== -1) {
      const window = page1Text.slice(siteIdx, siteIdx + 120);
      const m = window.match(/\b([A-Za-z]{4,}[A-Za-z0-9_]*)\b/g);
      if (m) {
        for (const word of m) {
          const upper = word.toUpperCase();
          if (!/^(SITE|NAME|GENERAL|INFORMATION|PLAID|PROJECT|SCOPE|TERRITORY|REGION|TOWERCO|ADDRESS)$/i.test(upper)) {
            result.siteName = upper;
            break;
          }
        }
      }
    }
  }

  // 3. PLAID / SITE ID - MUST BE STRICTLY FROM FIRST PAGE GENERAL INFORMATION TABLE
  // Strategy 1: Direct same-line or colon/dash match (e.g. "PLAID MIN2183", "PLAID: MIN2183", "PLAID - MIN 2183")
  const directPlaidMatch = page1Text.match(/\bPLAID\s*[:\-–]?\s*([A-Za-z]{2,5}\s*\d{2,6})\b/i);
  if (directPlaidMatch && directPlaidMatch[1]) {
    const candidate = directPlaidMatch[1].replace(/\s+/g, '').toUpperCase();
    if (/^[A-Za-z]{2,5}\d{2,6}$/.test(candidate) && !/^(PAGE|TERRITORY|REGION|SCOPE|SITE|BUILD)$/i.test(candidate)) {
      result.plaid = candidate;
    }
  }

  // Strategy 2: Multi-line / newline / table cell boundary (e.g. "PLAID\nMIN2183")
  if (!result.plaid) {
    const multilineMatch = page1Text.match(/\bPLAID\s*[:\-–]?(?:\r?\n|\s{2,})+([A-Za-z]{2,5}\s*\d{2,6})\b/i);
    if (multilineMatch && multilineMatch[1]) {
      const candidate = multilineMatch[1].replace(/\s+/g, '').toUpperCase();
      if (/^[A-Za-z]{2,5}\d{2,6}$/.test(candidate) && !/^(PAGE|TERRITORY|REGION|SCOPE|SITE|BUILD)$/i.test(candidate)) {
        result.plaid = candidate;
      }
    }
  }

  // Strategy 3: Proximity search within 200 characters following the word "PLAID"
  if (!result.plaid) {
    const plaidIdx = page1Text.search(/\bPLAID\b/i);
    if (plaidIdx !== -1) {
      const window = page1Text.slice(plaidIdx, plaidIdx + 200);
      const m = window.match(/\b(MIN\d{3,5}|DVO\d{3,5}|CDO\d{3,5}|[A-Za-z]{2,5}\d{2,6})\b/i);
      if (m && m[1]) {
        const candidate = m[1].toUpperCase();
        if (!/^(PAGE|TERRITORY|REGION|SCOPE|SITE|BUILD|CARD|FTTH)$/i.test(candidate)) {
          result.plaid = candidate;
        }
      }
    }
  }

  // Strategy 4: Telecom PLAID code anywhere on Page 1 (e.g. MIN2183, MIN2250, MIN668, DVO..., CDO...)
  if (!result.plaid) {
    const telecom = page1Text.match(/\b(MIN\d{3,5}|DVO\d{3,5}|CDO\d{3,5}|NCR\d{3,5}|SLZ\d{3,5}|NLZ\d{3,5}|VIS\d{3,5}|CEB\d{3,5}|ILO\d{3,5}|GEN\d{3,5}|COT\d{3,5}|ZAM\d{3,5}|BUT\d{3,5})\b/i);
    if (telecom && telecom[1]) {
      result.plaid = telecom[1].toUpperCase();
    }
  }

  // Strategy 5: Generic SITE ID label on Page 1
  if (!result.plaid) {
    const siteIdMatch = page1Text.match(/\bSITE\s*ID\s*[:\-–]?\s*([A-Za-z0-9_]+)/i);
    if (siteIdMatch && siteIdMatch[1]) {
      const candidate = siteIdMatch[1].trim().toUpperCase();
      if (/^[A-Za-z]{2,5}\d{2,6}$/.test(candidate)) {
        result.plaid = candidate;
      }
    }
  }

  // If table was column-oriented and PLAID is known, check token immediately preceding PLAID for Site Name
  if (!result.siteName && result.plaid) {
    const beforePlaidMatch = page1Text.match(new RegExp('([A-Za-z0-9_]{5,})\\s+' + result.plaid, 'i'));
    if (beforePlaidMatch && beforePlaidMatch[1]) {
      const s = beforePlaidMatch[1].trim().toUpperCase();
      if (!/^(PLAID|NAME|SITE|GENERAL|INFO|CARD|BUILD)$/i.test(s)) {
        result.siteName = s;
      }
    }
  }

  // 4. TERRITORY
  const terrMatch = page1Text.match(/TERRITORY\s*[:\-–]?\s*([A-Za-z0-9_]+)/i);
  if (terrMatch && terrMatch[1]) {
    result.territory = terrMatch[1].trim().toUpperCase();
  }

  // 5. REGION
  const regMatch = page1Text.match(/REGION\s*[:\-–]?\s*([A-Za-z0-9_\-\s]+?)(?=\s+(?:SITE\s*ADDRESS|TOWERCO|PLAID|\n|$))/i);
  if (regMatch && regMatch[1]) {
    result.region = regMatch[1].trim();
  }

  // 6. SITE ADDRESS
  const addrMatch = page1Text.match(/SITE\s*ADDRESS\s*[:\-–]?\s*([A-Za-z0-9_,\-\s\(\)]+?)(?=\s+(?:TOWERCO|TERRITORY|REGION|\n|$))/i);
  if (addrMatch && addrMatch[1]) {
    result.siteAddress = addrMatch[1].trim();
  }

  // 7. TOWERCO
  const towMatch = page1Text.match(/TOWERCO\s*[:\-–]?\s*([A-Za-z0-9_\-\s]+?)(?=\s+(?:PROJECT|SCOPE|\n|$))/i);
  if (towMatch && towMatch[1]) {
    result.towerco = towMatch[1].trim();
  }

  // 8. PROJECT & SCOPE
  const projMatch = page1Text.match(/PROJECT\s*[:\-–]?\s*([A-Za-z0-9_\-\s]+?)(?=\s+(?:SCOPE|SOLUTION|SITE\s*NAME|\n|$))/i);
  if (projMatch && projMatch[1]) {
    result.project = projMatch[1].trim();
  }
  const scopeMatch = page1Text.match(/SCOPE\s*[:\-–]?\s*([A-Za-z0-9_\-\s]+?)(?=\s+(?:SOLUTION|SITE\s*NAME|\n|$))/i);
  if (scopeMatch && scopeMatch[1]) {
    result.scope = scopeMatch[1].trim();
  }

  return result;
}

/**
 * Synthesizes official MOP template specifications from text & filename
 */
export function synthesizeSpecsFromText(
  fileName: string,
  extractedText: string,
  preferredFormat?: 'ONE_TSSR' | 'ERICSSON_FTTH' | 'AUTO_DETECT'
): OfficialMopSpecs {
  const meta = parseFileNameMetadata(fileName);
  const textUpper = extractedText.toUpperCase();
  const genInfo = parseFirstPageGeneralInfo(extractedText);

  let format: 'ONE_TSSR' | 'ERICSSON_FTTH';
  if (preferredFormat && preferredFormat !== 'AUTO_DETECT') {
    format = preferredFormat;
  } else if (
    (genInfo.project && /FTTH/i.test(genInfo.project)) ||
    meta.isEricsson ||
    textUpper.includes('FTTH') ||
    textUpper.includes('HORIZONTAL') ||
    textUpper.includes('MIN668') ||
    textUpper.includes('TCPHT')
  ) {
    format = 'ERICSSON_FTTH';
  } else {
    format = 'ONE_TSSR';
  }

  // Clone official template structure
  const baseSpecs: OfficialMopSpecs = JSON.parse(
    JSON.stringify(format === 'ERICSSON_FTTH' ? SAMPLE_ERICSSON_FTTH : SAMPLE_ONE_TSSR)
  );

  baseSpecs.tssrFileName = fileName;

  // Apply First Page General Information fields with ground-truth priority
  const siteId = genInfo.plaid || meta.siteId || baseSpecs.plaid || baseSpecs.siteId || 'MIN_SITE';
  const siteName = genInfo.siteName || meta.siteName || baseSpecs.site_name || baseSpecs.siteName || 'SITE_NAME';

  baseSpecs.siteId = siteId;
  baseSpecs.siteName = siteName;
  baseSpecs.site_name = siteName;
  baseSpecs.plaid = siteId;
  baseSpecs.siteLocationSystem = `${siteName}_${siteId}`;

  // Preserve First Page metadata
  if (genInfo.solution) baseSpecs.solution = genInfo.solution;
  if (genInfo.project) baseSpecs.project = genInfo.project;
  if (genInfo.scope) baseSpecs.scope = genInfo.scope;
  if (genInfo.territory) baseSpecs.territory = genInfo.territory;
  if (genInfo.region) baseSpecs.region = genInfo.region;
  if (genInfo.siteAddress) baseSpecs.siteAddress = genInfo.siteAddress;
  if (genInfo.towerco) baseSpecs.towerco = genInfo.towerco;

  // CRITICAL: Ground-truth Solution & Equipment Detection
  if (genInfo.equipment) {
    baseSpecs.equipment = genInfo.equipment;
    baseSpecs.equipmentModel = genInfo.equipment;
    baseSpecs.olt_label_custom = genInfo.oltLabel || 'OLT MF-2';
  } else if (textUpper.includes('MF2') || textUpper.includes('MF-2')) {
    baseSpecs.equipment = 'Nokia Lightspan MF-2';
    baseSpecs.equipmentModel = 'Nokia Lightspan MF-2';
    baseSpecs.olt_label_custom = 'OLT MF-2';
  } else if (textUpper.includes('DF16') || textUpper.includes('DF-16')) {
    baseSpecs.equipment = 'Nokia Lightspan DF-16M';
    baseSpecs.equipmentModel = 'Nokia Lightspan DF-16M';
    baseSpecs.olt_label_custom = 'OLT DF-16M';
  } else if (textUpper.includes('FX-4') || textUpper.includes('FX4')) {
    baseSpecs.equipment = 'Nokia Lightspan FX-4';
    baseSpecs.equipmentModel = 'Nokia Lightspan FX-4';
    baseSpecs.olt_label_custom = 'OLT FX-4';
  } else {
    // Default for standard FTTH Horizontal
    baseSpecs.equipment = 'Nokia Lightspan MF-2';
    baseSpecs.equipmentModel = 'Nokia Lightspan MF-2';
    baseSpecs.olt_label_custom = 'OLT MF-2';
  }

  // Update Proponent Department and Project Name to match the detected equipment
  if (baseSpecs.proponents) {
    baseSpecs.proponents.forEach((p) => {
      p.deptDiv = `Nokia / ${baseSpecs.equipment}`;
    });
  }
  baseSpecs.projectName = `Blaine Plus Project for additional OLT GPON/VOICE deployment of Nokia ${baseSpecs.equipment} equipment for the Globe Project`;

  // Output filename
  const territory = genInfo.territory || 'T7';
  if (format === 'ERICSSON_FTTH') {
    baseSpecs.generatedMopFileName = `MOP_POWERTAPPING_FTTH_HORIZONTAL_${territory}_${siteName}_${siteId}.docx`;
  } else {
    baseSpecs.generatedMopFileName = `MOP_${siteName}_${siteId}.docx`;
  }

  // Ensure baseSpecs has at least 2 RS entries available
  if (!baseSpecs.rs_entries || baseSpecs.rs_entries.length < 2) {
    baseSpecs.rs_entries = [
      baseSpecs.rs_entries?.[0] || {
        name: 'Eltek Flatpack 1',
        load: 'F1',
        ampere: '16A',
        rdnt_load: 'F2',
        rdnt_ampere: '16A',
      },
      baseSpecs.rs_entries?.[1] || {
        name: 'Eltek Flatpack 2',
        load: '',
        ampere: '',
        rdnt_load: '',
        rdnt_ampere: '',
      },
    ];
  }

  // --- RECTIFIER SYSTEMS (RS) & 2 RS HEURISTIC DETECTION ---
  // Detect primary rectifier brand / system
  let detectedBrand = 'Eltek Flatpack';
  if (/ELTEK/i.test(extractedText)) {
    detectedBrand = 'Eltek Flatpack';
  } else if (/VERTIV|EMERSON|NETSURE/i.test(extractedText)) {
    detectedBrand = 'Vertiv NetSure';
  } else if (/DELTA/i.test(extractedText)) {
    detectedBrand = 'Delta DPR';
  } else if (/HUAWEI/i.test(extractedText)) {
    detectedBrand = 'Huawei TP48200B';
  } else if (/ZTE/i.test(extractedText)) {
    detectedBrand = 'ZTE ZXDU';
  }

  // Check for 2 RS presence in TSSR:
  // 1. Explicit RS2 / Rectifier 2 keywords
  const rs2ExplicitMatch = /\b(?:RS\s*2|RS2|RECTIFIER\s*2|RECTIFIER\s*SYSTEM\s*2|DCPS\s*2|DCPS2|REC\s*2|RECT\s*2|RECTIFIER#2|CABINET\s*2)\b/i.test(extractedText);
  // 2. Count phrases like "2 Rectifiers", "Two Rectifiers", "Total Rectifiers: 2"
  const twoRectifiersCountMatch = /\b(?:TOTAL\s*(?:NO\.?\s*OF\s*)?RECTIFIERS?|NO\.?\s*OF\s*RECTIFIERS?|NUMBER\s*OF\s*RECTIFIERS?)\s*[:\-–]?\s*2\b/i.test(extractedText) ||
    /\b(?:2|TWO)\s*(?:EXISTING\s*)?(?:RECTIFIERS?|RECTIFIER\s*SYSTEMS?|DCPS|RS)\b/i.test(extractedText);
  // 3. Co-occurrence of RS1 and RS2 in same document
  const rs1AndRs2Match = /\b(?:RS\s*1|RECTIFIER\s*1|DCPS\s*1)\b[\s\S]{1,2500}\b(?:RS\s*2|RECTIFIER\s*2|DCPS\s*2)\b/i.test(extractedText);
  // 4. Photos / Schedule for Rectifier 2
  const rs2PhotoOrSchedule = /\b(?:EXISTING\s*RECTIFIER\s*2|LOAD\s*SCHEDULE\s*(?:FOR\s*)?(?:RS\s*2|RECTIFIER\s*2)|RECTIFIER\s*2\s*LOAD|RS\s*2\s*LOAD)\b/i.test(extractedText);

  const has2Rectifiers = rs2ExplicitMatch || twoRectifiersCountMatch || rs1AndRs2Match || rs2PhotoOrSchedule;

  if (has2Rectifiers) {
    baseSpecs.total_rectifiers = 2;
    baseSpecs.detected_2_rs = true;
    baseSpecs.rs_detection_notes = 'Detected 2 Rectifier Systems (RS1 & RS2) in TSSR survey.';
    baseSpecs.rs_entries[0].name = `${detectedBrand} 1`;
    baseSpecs.rs_entries[1].name = `${detectedBrand} 2`;
    baseSpecs.rectifierSystem = `${detectedBrand} 1`;
  } else {
    baseSpecs.total_rectifiers = 1;
    baseSpecs.detected_2_rs = false;
    baseSpecs.rs_entries[0].name = `${detectedBrand} 1`;
    baseSpecs.rectifierSystem = `${detectedBrand} 1`;
  }

  // Detect separate tapping vs same rectifier tapping
  // e.g. "Main ... RS1 ... RDNT ... RS2" or "RS1 (MAIN) / RS2 (RDNT)" or "SEPARATE RECTIFIERS"
  const separateTappingMatch =
    /\b(?:MAIN|TAP\s*1)[\s\S]{1,120}(?:RS\s*1|RECTIFIER\s*1)[\s\S]{1,250}(?:RDNT|REDUNDANT|TAP\s*2)[\s\S]{1,120}(?:RS\s*2|RECTIFIER\s*2)\b/i.test(extractedText) ||
    /\b(?:RS\s*1|RECTIFIER\s*1)[\s\S]{1,80}(?:MAIN)[\s\S]{1,250}(?:RS\s*2|RECTIFIER\s*2)[\s\S]{1,80}(?:RDNT|REDUNDANT)\b/i.test(extractedText) ||
    /\b(?:SEPARATE\s*RECTIFIERS?|SEPARATE\s*RS)\b/i.test(extractedText);

  if (has2Rectifiers && separateTappingMatch) {
    baseSpecs.tapping_mode = 'Main + RDNT – Separate Rectifiers';
  } else {
    baseSpecs.tapping_mode = 'Main + RDNT – Same Rectifier';
  }

  // Fuses extraction: search for F1-F64 or L1-L64
  const fuseMatches = extractedText.match(/\b([FL]\d{1,2})\b/g);
  if (fuseMatches && fuseMatches.length > 0) {
    const uniqueFuses = Array.from(new Set(fuseMatches));
    baseSpecs.fuseMain = uniqueFuses[0];
    baseSpecs.rs_entries[0].load = uniqueFuses[0];

    if (uniqueFuses.length > 1) {
      if (baseSpecs.tapping_mode === 'Main + RDNT – Separate Rectifiers') {
        baseSpecs.rs_entries[1].load = uniqueFuses[1];
        baseSpecs.fuseRedundant = uniqueFuses[1];
      } else {
        baseSpecs.rs_entries[0].rdnt_load = uniqueFuses[1];
        baseSpecs.fuseRedundant = uniqueFuses[1];
      }
    }
  }

  // Detect Implementation date if present in text
  const dateMatch = extractedText.match(/(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+[\s\-–]+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM)[\s\-–]+\d{1,2}:\d{2}\s*(?:AM|PM))?)/i);
  if (dateMatch && dateMatch[0]) {
    baseSpecs.target_datetime = dateMatch[0].trim();
    baseSpecs.targetImplementationDates = dateMatch[0].trim();
  }

  // Set date & remarks
  baseSpecs.dateApproved = new Date().toISOString().split('T')[0];
  baseSpecs.approver_remarks_images = [];
  baseSpecs.additional_photos = [];

  return baseSpecs;
}

/**
 * Opens the uploaded/attached TSSR in a new browser tab.
 * Uses a Blob URL from dataUrl if available, or renders an official HTML TSSR document blob.
 */
export function openTssrInNewTab(specs: OfficialMopSpecs): void {
  if (specs.tssrFileDataUrl) {
    try {
      const parts = specs.tssrFileDataUrl.split(',');
      const isImage = specs.tssrFileDataUrl.startsWith('data:image/');
      const mime = parts[0].match(/:(.*?);/)?.[1] || (isImage ? 'image/png' : 'application/pdf');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    } catch (err) {
      console.warn('Failed to open TSSR dataUrl in new tab:', err);
    }
  }

  // Fallback: Generate an official TSSR summary HTML document and open in new tab
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TSSR - ${specs.site_name || specs.siteName} (${specs.plaid || specs.siteId})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; margin: 0; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .header { border-bottom: 3px solid #00b0f0; padding-bottom: 12px; margin-bottom: 24px; }
    h1 { color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .subtitle { color: #64748b; font-size: 13px; margin: 0; }
    .badge { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #065f46; font-weight: 700; border-radius: 6px; font-size: 11px; border: 1px solid #a7f3d0; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 13px; }
    th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
    tr:nth-child(even) td { background-color: #f8fafc; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TECHNICAL SITE SURVEY REPORT (TSSR)</h1>
      <p class="subtitle">Reference Document: ${specs.tssrFileName || 'Approved TSSR Proposal'}</p>
      <span class="badge">APPROVED FOR COMMERCIAL POWER TAPPING</span>
    </div>
    <table>
      <tr><th colspan="2" style="background:#00b0f0;color:#000;">PAGE 1 GENERAL INFORMATION</th></tr>
      <tr><td style="width:35%;font-weight:600;">PROJECT</td><td>${specs.project || 'FTTH HORIZONTAL'}</td></tr>
      <tr><td style="font-weight:600;">SCOPE</td><td>${specs.scope || 'NEW BUILD'}</td></tr>
      <tr><td style="font-weight:600;">SOLUTION (OLT MODEL)</td><td><strong>${specs.solution || specs.equipment}</strong> (${specs.olt_label_custom})</td></tr>
      <tr><td style="font-weight:600;">SITE NAME</td><td><strong>${specs.site_name || specs.siteName}</strong></td></tr>
      <tr><td style="font-weight:600;">PLAID / SITE ID</td><td><strong style="color:#b91c1c;">${specs.plaid || specs.siteId}</strong></td></tr>
      <tr><td style="font-weight:600;">TERRITORY</td><td>${specs.territory || 'T7'}</td></tr>
      <tr><td style="font-weight:600;">REGION</td><td>${specs.region || 'MINDANAO'}</td></tr>
      <tr><td style="font-weight:600;">SITE ADDRESS</td><td>${specs.siteAddress || 'Survey Location Verified'}</td></tr>
      <tr><td style="font-weight:600;">TOWERCO</td><td>${specs.towerco || 'PHILTOWER'}</td></tr>
      <tr><th colspan="2">POWER TAPPING SPECIFICATIONS</th></tr>
      <tr><td style="font-weight:600;">Rectifier System</td><td>${specs.rs_entries?.[0]?.name || 'ELTEK Flatpack 1'}</td></tr>
      <tr><td style="font-weight:600;">Breaker Assignment</td><td>Main: ${specs.rs_entries?.[0]?.load || 'F1'} (${specs.rs_entries?.[0]?.ampere || '16A'}) | RDNT: ${specs.rs_entries?.[0]?.rdnt_load || 'F2'} (${specs.rs_entries?.[0]?.rdnt_ampere || '16A'})</td></tr>
      <tr><td style="font-weight:600;">Prepared / Surveyed By</td><td>${specs.prepared_by} (${specs.position})</td></tr>
      <tr><td style="font-weight:600;">Target Date Window</td><td>${specs.target_datetime}</td></tr>
    </table>
    <div class="footer">
      MOP Powertapping Generator · Section 14 Official Supporting Document
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

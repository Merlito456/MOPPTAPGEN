import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { OfficialMopSpecs, RectifierEntry, TappingMode } from '../types/mop';

export const MODE_SINGLE: TappingMode = 'Single Tapping Point';
export const MODE_SAME_RS: TappingMode = 'Main + RDNT – Same Rectifier';
export const MODE_SEPARATE_RS: TappingMode = 'Main + RDNT – Separate Rectifiers';

export function normalizeSpaces(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

export function safeFilename(s: string): string {
  return (s || '').replace(/[\\/*?:"<>|]+/g, '_').trim().replace(/\s+/g, '_');
}

export function buildOltLabel(equipment: string, customOltLabel: string): string {
  const norm = normalizeSpaces(equipment).toLowerCase();
  if (norm.includes('mf-2') || norm.includes('mf2')) {
    return 'OLT MF-2';
  }
  if (norm.includes('df-16m') || norm.includes('df16m') || norm.includes('df-16') || norm.includes('df16')) {
    return 'OLT DF-16M';
  }
  if (norm.includes('fx-4') || norm.includes('fx4')) {
    return 'OLT FX-4';
  }
  if (norm.includes('fx-8') || norm.includes('fx8')) {
    return 'OLT FX-8';
  }
  if (norm.includes('ma5800')) {
    return 'OLT MA5800';
  }
  return normalizeSpaces(customOltLabel) || normalizeSpaces(equipment);
}

export function applyReplacementsSinglePass(text: string, replacements: Record<string, string>): string {
  if (!text || !replacements) return text;
  const valid: Record<string, string> = {};
  for (const [k, v] of Object.entries(replacements)) {
    if (k && v !== undefined) valid[k] = String(v);
  }
  const keys = Object.keys(valid).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;

  const escaped = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(escaped.join('|'), 'g');
  return text.replace(regex, (match) => (valid[match] !== undefined ? valid[match] : match));
}

export function buildReplacements(data: OfficialMopSpecs): Record<string, string> {
  const equipment = data.equipment;
  const olt_label = buildOltLabel(equipment, data.olt_label_custom);
  const site_name = data.site_name;
  const plaid = data.plaid;

  const parts = equipment.trim().split(/\s+/);
  const vendor = parts[0] || 'Nokia';
  const model = parts.length > 1 ? parts[parts.length - 1] : equipment;

  const rawDate = (data.target_datetime || data.targetImplementationDates || '').trim();
  const cleanDate = rawDate.replace(/^[<>\s]+|[<>\s]+$/g, '');
  const bracketDate = `< ${cleanDate} >`;

  return {
    // Exact Document & Header Titles
    'Power tapping of Site Nokia OLT CDO-604 System': `Power tapping of Site ${vendor} ${olt_label} ${site_name} System`,
    'Site Nokia OLT CDO-604 System': `Site ${vendor} ${olt_label} ${site_name} System`,
    'To power on CDO-604(mini OLT) for B2B as a pre-requisite of Site deployment.': `To power on ${site_name}(mini OLT) for B2B as a pre-requisite of Site deployment.`,
    'CDO-604(mini OLT)': `${site_name}(mini OLT)`,

    // Site + Plaid combinations in Document & Header XMLs
    'CDO-604_MIN995': `${site_name}_${plaid}`,
    'CDO-604 _MIN995': `${site_name}_${plaid}`,
    'MIN995_CDO-604': `${plaid}_${site_name}`,
    'CDO-604_MIN699': `${site_name}_${plaid}`,
    'CDO-604 _MIN699': `${site_name}_${plaid}`,
    'MIN699_CDO-604': `${plaid}_${site_name}`,
    'PAGATPATCDOMISOR_MIN2250': `${site_name}_${plaid}`,
    'PAGATPATCDOMISOR _MIN2250': `${site_name}_${plaid}`,
    'MIN2250_PAGATPATCDOMISOR': `${plaid}_${site_name}`,
    'TCPHTPOBLAMAWABDDO_MIN668': `${site_name}_${plaid}`,
    'TCPHTPOBLAMAWABDDO _MIN668': `${site_name}_${plaid}`,
    'MIN668_TCPHTPOBLAMAWABDDO': `${plaid}_${site_name}`,
    'KIMADZILCARMENCOT_MIN2183': `${site_name}_${plaid}`,
    'KIMADZILCARMENCOT _MIN2183': `${site_name}_${plaid}`,
    'MIN2183_KIMADZILCARMENCOT': `${plaid}_${site_name}`,

    // Equipment MF-2 variants (Template.docx baseline)
    'Nokia Lightspan MF-2': equipment,
    'Nokia Lightspan MF2': equipment,
    'Nokia / OLT MF-2': `${vendor} / ${olt_label}`,
    'Nokia/ OLT MF-2': `${vendor} / ${olt_label}`,
    'Nokia /OLT MF-2': `${vendor} / ${olt_label}`,
    'Nokia OLT MF-2': `${vendor} ${olt_label}`,
    'Nokia OLT MF2': `${vendor} ${olt_label}`,
    'Lightspan OLT MF-2': `Lightspan ${olt_label}`,
    'Lightspan MF-2': equipment,
    'Lightspan MF2': equipment,
    'OLT MF-2': olt_label,
    'OLT MF2': olt_label,
    'MF-2': model,
    'MF2': model,

    // Equipment DF-16M variants (Audited for 100% accurate detection & replacement)
    'Nokia Lightspan DF-16M': equipment,
    'Nokia Lightspan DF16M': equipment,
    'Nokia Lightspan DF-16': equipment,
    'Nokia Lightspan DF16': equipment,
    'Nokia / Nokia Lightspan DF-16M': `${vendor} / ${olt_label}`,
    'Nokia / OLT DF-16M': `${vendor} / ${olt_label}`,
    'Nokia/ OLT DF-16M': `${vendor} / ${olt_label}`,
    'Nokia OLT DF-16M': `${vendor} ${olt_label}`,
    'Lightspan OLT DF-16M': `Lightspan ${olt_label}`,
    'Lightspan DF-16M': equipment,
    'OLT DF-16M': olt_label,
    'OLT DF16M': olt_label,
    'OLT DF-16': olt_label,
    'OLT DF16': olt_label,
    'DF-16M': model,
    'DF16M': model,
    'DF-16': model,
    'DF16': model,

    // Site / Plaid standalone
    'CDO-604': site_name,
    'MIN699': plaid,
    'MIN995': plaid,
    'PAGATPATCDOMISOR': site_name,
    'MIN2250': plaid,
    'TCPHTPOBLAMAWABDDO': site_name,
    'MIN668': plaid,
    'KIMADZILCARMENCOT': site_name,
    'MIN2183': plaid,

    // People & Dates
    'John Carlo Rabanes': data.prepared_by,
    'OLT Rollout Engineer': data.position,
    'OLT Engineer': data.position,
    '< May 19- June 19, 2026 10:00AM-6:00PM>': bracketDate,
    '<May 19- June 19, 2026 10:00AM-6:00PM>': bracketDate,
    'May 19- June 19, 2026 10:00AM-6:00PM': cleanDate,
    'May 19- June 19, 2026': cleanDate,
    'May 19 - June 19, 2026': cleanDate,
    '< November 9 - December 9, 2026 08:00AM-08:00PM>': bracketDate,
    '<November 9 - December 9, 2026 08:00AM-08:00PM>': bracketDate,
    'November 9 - December 9, 2026 08:00AM-08:00PM': cleanDate,
    'November 9- December 9, 2026 08:00AM-08:00PM': cleanDate,
    'November 9 - December 9, 2026': cleanDate,
    'November 9- December 9, 2026': cleanDate,

    // Generic placeholders
    '{{SITE_NAME}}': site_name,
    '{{PLAID}}': plaid,
    '{{EQUIPMENT}}': equipment,
    '{{PREPARED_BY}}': data.prepared_by,
    '{{POSITION}}': data.position,
    '{{TARGET_DATETIME}}': cleanDate,
  };
}

export function fuseNoLine(load: string, olt_label: string, equipment: string, label?: string): string {
  let txt = `FUSE No: ${load} ${olt_label} – (${normalizeSpaces(equipment)} Power tapping point)`;
  if (label) {
    txt += ` – ${label}`;
  }
  return txt;
}

export function buildTappingSummary(
  tapping_mode: TappingMode,
  rs_entries: RectifierEntry[],
  equipment: string
): string[] {
  const lines: string[] = [];

  if (tapping_mode === MODE_SINGLE) {
    const rs = rs_entries[0];
    if (rs && rs.load) {
      let line = `Fuse ${rs.load}`;
      if (rs.ampere) line += ` (${rs.ampere})`;
      line += ` : ${equipment} Power Tapped`;
      if (rs.name) line += `  [${rs.name}]`;
      lines.push(line);
    }
  } else if (tapping_mode === MODE_SAME_RS) {
    const rs = rs_entries[0];
    if (rs && rs.load) {
      let main = `Fuse ${rs.load}`;
      if (rs.ampere) main += ` (${rs.ampere})`;
      main += ` : ${equipment} Power Tapped – MAIN`;
      if (rs.name) main += `  [${rs.name}]`;
      lines.push(main);

      if (rs.rdnt_load) {
        const rdnt_amp = rs.rdnt_ampere || rs.ampere || '';
        let rdnt = `Fuse ${rs.rdnt_load}`;
        if (rdnt_amp) rdnt += ` (${rdnt_amp})`;
        rdnt += ` : ${equipment} Power Tapped – RDNT`;
        if (rs.name) rdnt += `  [${rs.name}]`;
        lines.push(rdnt);
      }
    }
  } else if (tapping_mode === MODE_SEPARATE_RS) {
    const rs1 = rs_entries[0];
    const rs2 = rs_entries[1];

    if (rs1 && rs1.load) {
      let line = `Fuse ${rs1.load}`;
      if (rs1.ampere) line += ` (${rs1.ampere})`;
      line += ` : ${equipment} Power Tapped – MAIN`;
      if (rs1.name) line += `  [${rs1.name}]`;
      lines.push(line);
    }

    if (rs2 && rs2.load) {
      let line = `Fuse ${rs2.load}`;
      if (rs2.ampere) line += ` (${rs2.ampere})`;
      line += ` : ${equipment} Power Tapped – RDNT`;
      if (rs2.name) line += `  [${rs2.name}]`;
      lines.push(line);
    }
  }

  return lines;
}

function getParagraphText(p: any): string {
  const tNodes = p.getElementsByTagName('w:t');
  let full = '';
  for (let i = 0; i < tNodes.length; i++) {
    full += tNodes[i].textContent || '';
  }
  return full;
}

function setParagraphText(doc: any, p: any, text: string) {
  if (!text.includes('\n')) {
    const tNodes = p.getElementsByTagName('w:t');
    if (tNodes.length > 0) {
      for (let i = 0; i < tNodes.length; i++) {
        tNodes[i].textContent = i === 0 ? text : '';
      }
      return;
    }
  }

  // Clear runs and recreate with proper w:br tags for multiline strings
  const pPr = p.getElementsByTagName('w:pPr')[0];
  while (p.firstChild) {
    p.removeChild(p.firstChild);
  }
  if (pPr) {
    p.appendChild(pPr);
  }

  const lines = text.split('\n');
  const r = doc.createElement('w:r');
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      r.appendChild(doc.createElement('w:br'));
    }
    const t = doc.createElement('w:t');
    t.textContent = lines[i];
    if (lines[i].startsWith(' ') || lines[i].endsWith(' ')) {
      t.setAttribute('xml:space', 'preserve');
    }
    r.appendChild(t);
  }
  p.appendChild(r);
}

function insertImageDrawingIntoParagraph(
  doc: any,
  p: any,
  relId: string,
  docPrId: number,
  imageName: string
) {
  while (p.firstChild) {
    p.removeChild(p.firstChild);
  }

  // Create paragraph property centering the image with tight spacing to avoid page overflows
  // NOTE: In ECMA-376 CT_PPr schema, w:spacing MUST precede w:jc
  const pPr = doc.createElement('w:pPr');
  const spacing = doc.createElement('w:spacing');
  spacing.setAttribute('w:before', '40');
  spacing.setAttribute('w:after', '40');
  pPr.appendChild(spacing);

  const jc = doc.createElement('w:jc');
  jc.setAttribute('w:val', 'center');
  pPr.appendChild(jc);

  p.appendChild(pPr);

  // Balanced compact dimensions to avoid excessive page gaps (3.6 inches x 1.9 inches)
  const cx = 3291840; // 3.6 inches in EMUs
  const cy = 1737360; // 1.9 inches in EMUs

  const drawingXml = `<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${docPrId}" name="${imageName}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${imageName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

  const parsedR = new DOMParser().parseFromString(drawingXml, 'application/xml');
  p.appendChild(parsedR.documentElement);
}

function dataUrlToUint8Array(dataUrl: string): { data: Uint8Array; ext: string } {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (match) {
    const rawExt = match[1].toLowerCase();
    const ext = rawExt.includes('jpeg') || rawExt.includes('jpg') ? 'jpeg' : 'png';
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { data: bytes, ext };
  }
  return { data: new Uint8Array(0), ext: 'png' };
}

export async function generateMopDocxBlob(data: OfficialMopSpecs): Promise<Blob> {
  // Load master Template.docx
  const templateUrl = '/templates/Template.docx';
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`Failed to load Template.docx: ${response.statusText}`);
  }

  const templateArrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(templateArrayBuffer);

  const docXmlStr = await zip.file('word/document.xml')!.async('string');
  const relsXmlStr = await zip.file('word/_rels/document.xml.rels')!.async('string');

  const doc = new DOMParser().parseFromString(docXmlStr, 'application/xml');
  const relsDoc = new DOMParser().parseFromString(relsXmlStr, 'application/xml');
  const relsRoot = relsDoc.getElementsByTagName('Relationships')[0] || relsDoc.documentElement;

  const rs1 = data.rs_entries[0] || { name: '', load: '', ampere: '', rdnt_load: '', rdnt_ampere: '' };
  const rs2 = data.rs_entries[1] || { name: '', load: '', ampere: '', rdnt_load: '', rdnt_ampere: '' };
  const show_rs2_section = data.total_rectifiers >= 2;
  const olt_label = buildOltLabel(data.equipment, data.olt_label_custom);
  const equipment = data.equipment;
  const parts = equipment.trim().split(/\s+/);
  const vendor = parts[0] || 'Nokia';
  const model = parts.length > 1 ? parts[parts.length - 1] : equipment;

  // Track image attachments
  let imageCounter = 400;
  const attachImage = (dataUrl: string, baseName: string): string => {
    imageCounter++;
    const { data: imgBytes, ext } = dataUrlToUint8Array(dataUrl);
    const mediaFileName = `${baseName}_${imageCounter}.${ext}`;
    const relId = `rId_${baseName}_${imageCounter}`;

    zip.file(`word/media/${mediaFileName}`, imgBytes);

    const relEl = relsDoc.createElement('Relationship');
    relEl.setAttribute('Id', relId);
    relEl.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
    relEl.setAttribute('Target', `media/${mediaFileName}`);
    if (relsRoot) {
      relsRoot.appendChild(relEl);
    }

    return relId;
  };

  // Find all paragraphs in document.xml
  const paras: any[] = Array.from(doc.getElementsByTagName('w:p'));

  // 1. Proposed Rectifier System Header Paras
  const rectHeaderParas: any[] = [];
  for (const p of paras) {
    const txt = getParagraphText(p).toUpperCase();
    if (txt.includes('PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE')) {
      rectHeaderParas.push(p);
    }
  }

  // 1b. Section 5 Target Date and Time of Implementation update
  // The template has "Target Date and Time of Implementation: " followed by fragmented date runs.
  // We locate the label run, update the first date run's text to the user's date, and prune any excess fragmented runs.
  for (const p of paras) {
    const txt = getParagraphText(p);
    if (/Target Date and Time of Implementation/i.test(txt)) {
      const rawVal = (data.target_datetime || data.targetImplementationDates || '').trim();
      const cleanDate = rawVal.replace(/^[<>\s]+|[<>\s]+$/g, '');
      const formattedDate = `< ${cleanDate} >`;

      const runs = Array.from(p.getElementsByTagName('w:r'));
      let labelIdx = -1;
      for (let i = 0; i < runs.length; i++) {
        const rTxt = (runs[i] as any).textContent || '';
        if (/Target Date and Time of Implementation/i.test(rTxt)) {
          labelIdx = i;
          break;
        }
      }

      if (labelIdx !== -1 && labelIdx + 1 < runs.length) {
        // First subsequent run holds the formatted date
        const firstDateRun: any = runs[labelIdx + 1];
        const t = firstDateRun.getElementsByTagName('w:t')[0];
        if (t) {
          t.textContent = formattedDate;
          t.setAttribute('xml:space', 'preserve');
        }
        // Remove remaining fragmented date runs from the template
        for (let j = labelIdx + 2; j < runs.length; j++) {
          p.removeChild(runs[j]);
        }
      }
      break;
    }
  }

  // 1c. COMPACT OVERSIZED TABLE ROW HEIGHTS
  // Fixes the massive empty vertical spaces between pages (e.g. 7000-8000 dxa = 5-6 inches)
  // Sets artificial huge row heights to natural snug height with atLeast rule so content fits snugly
  const trs = Array.from(doc.getElementsByTagName('w:tr'));
  for (const tr of trs) {
    const trPr = tr.getElementsByTagName('w:trPr')[0];
    if (trPr) {
      const trH = trPr.getElementsByTagName('w:trHeight')[0];
      if (trH) {
        const val = parseInt(trH.getAttribute('w:val') || '0', 10);
        if (val > 2500) {
          trH.setAttribute('w:val', '500');
          trH.setAttribute('w:hRule', 'atLeast');
        }
      }
    }
  }

  // 1f. UPDATE MOP HISTORY TABLE (Table 0)
  const tbls = Array.from(doc.getElementsByTagName('w:tbl'));
  if (tbls.length > 0) {
    const tbl0 = tbls[0];
    const t0Rows = Array.from(tbl0.getElementsByTagName('w:tr'));
    if (t0Rows.length > 1) {
      const dataRow = t0Rows[1];
      const cells = Array.from(dataRow.getElementsByTagName('w:tc'));
      // Cell 2: Author
      if (cells.length > 2 && data.prepared_by) {
        const pAuthor = cells[2].getElementsByTagName('w:p')[0];
        if (pAuthor) {
          setParagraphText(doc, pAuthor, data.prepared_by);
        }
      }
      // Cell 4: Date Approved
      if (cells.length > 4) {
        const pDate = cells[4].getElementsByTagName('w:p')[0];
        const approvedDate = data.dateApproved || new Date().toISOString().split('T')[0];
        if (pDate) {
          setParagraphText(doc, pDate, approvedDate);
        }
      }
    }
  }

  // RECTIFIER 1 Header
  if (rectHeaderParas.length > 0 && rs1) {
    let r1_header = '';
    if (data.tapping_mode === MODE_SINGLE) {
      r1_header = `PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE: (RECTIFIER 1 – ${rs1.name})`;
    } else if (data.tapping_mode === MODE_SAME_RS) {
      const rdnt_info = rs1.rdnt_load ? ` / RDNT: ${rs1.rdnt_load}` : '';
      r1_header = `PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE: (RECTIFIER 1 – ${rs1.name} / MAIN: ${rs1.load}${rdnt_info})`;
    } else {
      r1_header = `PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE: (RECTIFIER 1 – ${rs1.name} – MAIN)`;
    }
    setParagraphText(doc, rectHeaderParas[0], r1_header);
  }

  // RECTIFIER 2 Header
  if (rectHeaderParas.length >= 2) {
    if (!show_rs2_section) {
      setParagraphText(doc, rectHeaderParas[1], '');
    } else if (data.tapping_mode === MODE_SEPARATE_RS && rs2.name) {
      setParagraphText(doc, rectHeaderParas[1], `PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE: (RECTIFIER 2 – ${rs2.name} – RDNT)`);
    } else {
      const rs2_display = rs2.name || 'Rectifier 2';
      setParagraphText(doc, rectHeaderParas[1], `PROPOSED RECTIFIER SYSTEM LOAD BREAKER FUSE: (RECTIFIER 2 – ${rs2_display} – Not Used for Tapping)`);
    }
  }

  // 2. FUSE Lines in Section 2
  for (const p of paras) {
    const txt = getParagraphText(p);
    if (txt.includes('{{load}}') || txt.includes('FUSE No:') || txt.includes('FUSE No: L3')) {
      if (data.tapping_mode === MODE_SINGLE) {
        setParagraphText(doc, p, fuseNoLine(rs1.load, olt_label, equipment));
      } else if (data.tapping_mode === MODE_SAME_RS) {
        const mainLine = fuseNoLine(rs1.load, olt_label, equipment, 'MAIN');
        const rdntLine = rs1.rdnt_load ? `\n` + fuseNoLine(rs1.rdnt_load, olt_label, equipment, 'RDNT') : '';
        setParagraphText(doc, p, mainLine + rdntLine);
      } else {
        setParagraphText(doc, p, fuseNoLine(rs1.load, olt_label, equipment, 'MAIN'));
      }
      break;
    }
  }

  // 3. Captions for RECTIFIER 1 & RECTIFIER 2
  for (const p of paras) {
    const rawTxt = getParagraphText(p).trim();
    if (rawTxt === 'RECTIFIER 1') {
      let cap = '';
      if (data.tapping_mode === MODE_SAME_RS) {
        const rdnt = rs1.rdnt_load ? ` / RDNT: ${rs1.rdnt_load}` : '';
        cap = `RECTIFIER 1 – ${rs1.name} (MAIN: ${rs1.load}${rdnt})`;
      } else if (data.tapping_mode === MODE_SEPARATE_RS) {
        cap = `RECTIFIER 1 – ${rs1.name} – MAIN`;
      } else {
        cap = `RECTIFIER 1 – ${rs1.name}`;
      }
      setParagraphText(doc, p, cap);
    } else if (rawTxt === 'RECTIFIER 2') {
      if (!show_rs2_section) {
        setParagraphText(doc, p, '');
      } else if (data.tapping_mode === MODE_SEPARATE_RS && rs2.name) {
        setParagraphText(doc, p, `RECTIFIER 2 – ${rs2.name} – RDNT`);
      } else {
        const rs2_display = rs2.name || 'Rectifier 2';
        setParagraphText(doc, p, `RECTIFIER 2 – ${rs2_display} – Not Used for Tapping`);
      }
    }
  }

  // 3b. Department / Division and Equipment label paragraphs where runs were fragmented in Template.docx
  for (const p of paras) {
    const rawTxt = getParagraphText(p).trim();
    if (rawTxt === 'Nokia / OLT MF-2' || rawTxt === 'Nokia/ OLT MF-2' || rawTxt.startsWith('Nokia / Nokia Lightspan')) {
      setParagraphText(doc, p, `${vendor} / ${olt_label}`);
    } else if (rawTxt === 'OLT MF-2' || rawTxt === 'OLT MF2') {
      setParagraphText(doc, p, olt_label);
    }
  }

  // 4. Update Images Placeholders in Section 2 and Section 20 (Multiple Photos Support)
  let rsLoadAnchorP: any = null;

  // Helper to extract clean array of image data URLs
  const getImagesList = (images?: string[], singleDataUrl?: string): string[] => {
    if (Array.isArray(images) && images.length > 0) {
      return images.filter((img) => Boolean(img && img.trim()));
    }
    if (singleDataUrl && singleDataUrl.trim()) {
      return [singleDataUrl.trim()];
    }
    return [];
  };

  const rs1LoadImgs = getImagesList(rs1.load_images, rs1.load_img_dataUrl);
  const rs1ExistImgs = getImagesList(rs1.existing_images, rs1.existing_img_dataUrl);
  const rs2LoadImgs = getImagesList(rs2.load_images, rs2.load_img_dataUrl);
  const rs2ExistImgs = getImagesList(rs2.existing_images, rs2.existing_img_dataUrl);

  const insertMultiImagesIntoParagraph = (
    targetP: any,
    imageList: string[],
    baseName: string,
    labelTitle: string,
    startDocPrId: number
  ) => {
    if (imageList.length === 0) {
      setParagraphText(doc, targetP, '');
      return;
    }

    // Insert first image into targetP
    const relIdFirst = attachImage(imageList[0], `${baseName}_1`);
    insertImageDrawingIntoParagraph(doc, targetP, relIdFirst, startDocPrId, `${labelTitle} 1`);

    // If multiple images, append subsequent images and captions right after targetP
    if (imageList.length > 1 && targetP.parentNode) {
      const parent = targetP.parentNode;
      let lastEl = targetP;

      for (let i = 1; i < imageList.length; i++) {
        const nextImgDataUrl = imageList[i];
        const nextRelId = attachImage(nextImgDataUrl, `${baseName}_${i + 1}`);

        // Image paragraph
        const nextImgP = doc.createElement('w:p');
        insertImageDrawingIntoParagraph(doc, nextImgP, nextRelId, startDocPrId + i, `${labelTitle} ${i + 1}`);

        if (lastEl.nextSibling) {
          parent.insertBefore(nextImgP, lastEl.nextSibling);
        } else {
          parent.appendChild(nextImgP);
        }
        lastEl = nextImgP;

        // Caption paragraph
        const nextCapP = doc.createElement('w:p');
        const capPPr = doc.createElement('w:pPr');
        const capSpacing = doc.createElement('w:spacing');
        capSpacing.setAttribute('w:before', '10');
        capSpacing.setAttribute('w:after', '40');
        capPPr.appendChild(capSpacing);

        const capJc = doc.createElement('w:jc');
        capJc.setAttribute('w:val', 'center');
        capPPr.appendChild(capJc);
        nextCapP.appendChild(capPPr);

        const capR = doc.createElement('w:r');
        const capRPr = doc.createElement('w:rPr');
        const capFont = doc.createElement('w:rFonts');
        capFont.setAttribute('w:ascii', 'Calibri');
        capRPr.appendChild(capFont);
        capRPr.appendChild(doc.createElement('w:i'));
        const capSz = doc.createElement('w:sz');
        capSz.setAttribute('w:val', '18'); // 9pt
        capRPr.appendChild(capSz);
        capR.appendChild(capRPr);

        const capT = doc.createElement('w:t');
        capT.textContent = `${labelTitle} (Photo ${i + 1} of ${imageList.length})`;
        capR.appendChild(capT);
        nextCapP.appendChild(capR);

        if (lastEl.nextSibling) {
          parent.insertBefore(nextCapP, lastEl.nextSibling);
        } else {
          parent.appendChild(nextCapP);
        }
        lastEl = nextCapP;
      }
    }
  };

  for (const p of paras) {
    const txt = getParagraphText(p);

    // RS1 Load Schedule Image
    if (/RS1\s*[Ll]oad\s*schedule\s*image/i.test(txt)) {
      rsLoadAnchorP = p;
      insertMultiImagesIntoParagraph(p, rs1LoadImgs, 'rs1_load', 'RS1 Load Schedule', 501);
    }

    // RS1 Existing Rectifier Photo
    if (/RS1\s*EXISTING\s*IMAGE/i.test(txt)) {
      insertMultiImagesIntoParagraph(p, rs1ExistImgs, 'rs1_exist', 'RS1 Existing Rectifier', 520);
    }

    // RS2 Load Schedule Image
    if (/RS2\s*[Ll]oad\s*schedule\s*image/i.test(txt)) {
      if (show_rs2_section) {
        rsLoadAnchorP = p;
        insertMultiImagesIntoParagraph(p, rs2LoadImgs, 'rs2_load', 'RS2 Load Schedule', 540);
      } else {
        setParagraphText(doc, p, '');
      }
    }

    // RS2 Existing Rectifier Photo
    if (/RS2\s*EXISTING\s*IMAGE/i.test(txt)) {
      if (show_rs2_section) {
        insertMultiImagesIntoParagraph(p, rs2ExistImgs, 'rs2_exist', 'RS2 Existing Rectifier', 560);
      } else {
        setParagraphText(doc, p, '');
      }
    }
  }

  // 4b. TSSR APPROVER REMARKS (Multiple Photos Support) on Tapping Point Section (Section 2)
  const validRemarksImages = (data.approver_remarks_images || []).filter((img) => Boolean(img && img.trim()));
  if (validRemarksImages.length > 0 && rsLoadAnchorP && rsLoadAnchorP.parentNode) {
    const parentCell = rsLoadAnchorP.parentNode;

    // Header paragraph for TSSR Approver Remarks
    const headerP = doc.createElement('w:p');
    const hpPr = doc.createElement('w:pPr');
    const hpStyle = doc.createElement('w:pStyle');
    hpStyle.setAttribute('w:val', 'TableParagraph');
    hpPr.appendChild(hpStyle);
    const hpSpacing = doc.createElement('w:spacing');
    hpSpacing.setAttribute('w:before', '100');
    hpSpacing.setAttribute('w:after', '40');
    hpPr.appendChild(hpSpacing);
    headerP.appendChild(hpPr);

    const hr = doc.createElement('w:r');
    const hrPr = doc.createElement('w:rPr');
    const hrFont = doc.createElement('w:rFonts');
    hrFont.setAttribute('w:ascii', 'Calibri');
    hrPr.appendChild(hrFont);
    hrPr.appendChild(doc.createElement('w:b'));
    const hsz = doc.createElement('w:sz');
    hsz.setAttribute('w:val', '22'); // 11pt
    hrPr.appendChild(hsz);
    hr.appendChild(hrPr);
    const ht = doc.createElement('w:t');
    ht.textContent = 'PROPOSED RECTIFIER SYSTEM: TSSR APPROVER REMARKS & TAPPING APPROVAL:';
    hr.appendChild(ht);
    headerP.appendChild(hr);

    if (rsLoadAnchorP.nextSibling) {
      parentCell.insertBefore(headerP, rsLoadAnchorP.nextSibling);
    } else {
      parentCell.appendChild(headerP);
    }

    let lastInserted = headerP;
    for (let idx = 0; idx < validRemarksImages.length; idx++) {
      const imgDataUrl = validRemarksImages[idx];
      const relId = attachImage(imgDataUrl, `tssr_remark_${idx + 1}`);

      // Image paragraph
      const imgP = doc.createElement('w:p');
      insertImageDrawingIntoParagraph(doc, imgP, relId, 600 + idx, `TSSR Approver Remark ${idx + 1}`);

      if (lastInserted.nextSibling) {
        parentCell.insertBefore(imgP, lastInserted.nextSibling);
      } else {
        parentCell.appendChild(imgP);
      }
      lastInserted = imgP;

      // Caption paragraph
      const capP = doc.createElement('w:p');
      const capPPr = doc.createElement('w:pPr');
      const capSpacing = doc.createElement('w:spacing');
      capSpacing.setAttribute('w:before', '10');
      capSpacing.setAttribute('w:after', '60');
      capPPr.appendChild(capSpacing);

      const capJc = doc.createElement('w:jc');
      capJc.setAttribute('w:val', 'center');
      capPPr.appendChild(capJc);

      capP.appendChild(capPPr);

      const capR = doc.createElement('w:r');
      const capRPr = doc.createElement('w:rPr');
      const capFont = doc.createElement('w:rFonts');
      capFont.setAttribute('w:ascii', 'Calibri');
      capRPr.appendChild(capFont);
      capRPr.appendChild(doc.createElement('w:i'));
      const capSz = doc.createElement('w:sz');
      capSz.setAttribute('w:val', '18'); // 9pt
      capRPr.appendChild(capSz);
      capR.appendChild(capRPr);
      const capT = doc.createElement('w:t');
      capT.textContent = `TSSR Approver Remarks / Tapping Point Approval Confirmation (Photo ${idx + 1} of ${validRemarksImages.length})`;
      capR.appendChild(capT);
      capP.appendChild(capR);

      if (lastInserted.nextSibling) {
        parentCell.insertBefore(capP, lastInserted.nextSibling);
      } else {
        parentCell.appendChild(capP);
      }
      lastInserted = capP;
    }
  }

  // 4c. ADDITIONAL PHOTO ATTACHMENTS (whenever provided by engineer)
  const additionalPhotos = (data.additional_photos || []).filter((p) => Boolean(p && p.dataUrl && p.dataUrl.trim()));
  if (additionalPhotos.length > 0 && rsLoadAnchorP && rsLoadAnchorP.parentNode) {
    const parentCell = rsLoadAnchorP.parentNode;

    // Header paragraph for Additional Photos
    const addHeaderP = doc.createElement('w:p');
    const ahpPr = doc.createElement('w:pPr');
    const ahpSpacing = doc.createElement('w:spacing');
    ahpSpacing.setAttribute('w:before', '140');
    ahpSpacing.setAttribute('w:after', '40');
    ahpPr.appendChild(ahpSpacing);
    addHeaderP.appendChild(ahpPr);

    const ahr = doc.createElement('w:r');
    const ahrPr = doc.createElement('w:rPr');
    const ahrFont = doc.createElement('w:rFonts');
    ahrFont.setAttribute('w:ascii', 'Calibri');
    ahrPr.appendChild(ahrFont);
    ahrPr.appendChild(doc.createElement('w:b'));
    const ahsz = doc.createElement('w:sz');
    ahsz.setAttribute('w:val', '22'); // 11pt
    ahrPr.appendChild(ahsz);
    ahr.appendChild(ahrPr);
    const aht = doc.createElement('w:t');
    aht.textContent = 'ADDITIONAL SITE & POWER TAPPING PHOTO ATTACHMENTS:';
    ahr.appendChild(aht);
    addHeaderP.appendChild(ahr);

    parentCell.appendChild(addHeaderP);

    for (let idx = 0; idx < additionalPhotos.length; idx++) {
      const item = additionalPhotos[idx];
      const relId = attachImage(item.dataUrl, `add_photo_${idx + 1}`);

      const imgP = doc.createElement('w:p');
      insertImageDrawingIntoParagraph(doc, imgP, relId, 700 + idx, item.title || `Additional Photo ${idx + 1}`);
      parentCell.appendChild(imgP);

      const capP = doc.createElement('w:p');
      const capPPr = doc.createElement('w:pPr');
      const capSpacing = doc.createElement('w:spacing');
      capSpacing.setAttribute('w:before', '10');
      capSpacing.setAttribute('w:after', '50');
      capPPr.appendChild(capSpacing);
      const capJc = doc.createElement('w:jc');
      capJc.setAttribute('w:val', 'center');
      capPPr.appendChild(capJc);
      capP.appendChild(capPPr);

      const capR = doc.createElement('w:r');
      const capRPr = doc.createElement('w:rPr');
      const capFont = doc.createElement('w:rFonts');
      capFont.setAttribute('w:ascii', 'Calibri');
      capRPr.appendChild(capFont);
      capRPr.appendChild(doc.createElement('w:i'));
      const capSz = doc.createElement('w:sz');
      capSz.setAttribute('w:val', '18'); // 9pt
      capRPr.appendChild(capSz);
      capR.appendChild(capRPr);
      const capT = doc.createElement('w:t');
      capT.textContent = `${item.title || `Site Photo ${idx + 1}`} (Attachment ${idx + 1} of ${additionalPhotos.length})`;
      capR.appendChild(capT);
      capP.appendChild(capR);
      parentCell.appendChild(capP);
    }
  }

  // 5. Section 20 Planned Activity Fuse Lines
  const fuseLines = buildTappingSummary(data.tapping_mode, data.rs_entries, data.equipment);
  if (fuseLines.length > 0) {
    for (const p of paras) {
      const txt = getParagraphText(p);
      if (txt.includes('Power Tapped') || txt.includes('Fuse L9') || txt.includes('Fuse L17')) {
        setParagraphText(doc, p, fuseLines.join('\n'));
        break;
      }
    }
  }

  // 6. Supporting Documents (Approved TSSR Attachment Hyperlink)
  if (data.tssrFileName) {
    // Update relationship hyperlink in document.xml.rels so clicking the PDF icon opens the user's TSSR file
    const relElements = Array.from(relsDoc.getElementsByTagName('Relationship'));
    for (const rel of relElements) {
      const id = (rel as any).getAttribute('Id');
      const target = (rel as any).getAttribute('Target') || '';
      const type = (rel as any).getAttribute('Type') || '';
      if (id === 'rId13' || (type.includes('hyperlink') && target.toLowerCase().includes('.pdf'))) {
        (rel as any).setAttribute('Target', encodeURI(data.tssrFileName));
      }
    }

    // Update the filename caption directly under the PDF icon in Section 14
    for (const p of paras) {
      const txt = getParagraphText(p).trim();
      if (txt === 'MIN995_CDO-604' || txt === 'MIN995_ CDO-604' || txt === 'MIN995_') {
        setParagraphText(doc, p, data.tssrFileName);
      }
    }
  }

  // 7. Single-Pass String Replacements across all text nodes
  const replacements = buildReplacements(data);
  const serializer = new XMLSerializer();
  let updatedDocXml = serializer.serializeToString(doc);
  updatedDocXml = applyReplacementsSinglePass(updatedDocXml, replacements);
  zip.file('word/document.xml', updatedDocXml);

  // Update relsXml
  const updatedRelsXml = serializer.serializeToString(relsDoc);
  zip.file('word/_rels/document.xml.rels', updatedRelsXml);

  // Process all header and footer xml files with single-pass replacement
  for (const [filename, file] of Object.entries(zip.files)) {
    if (
      (filename.startsWith('word/header') || filename.startsWith('word/footer')) &&
      filename.endsWith('.xml')
    ) {
      const xmlStr = await file.async('string');
      zip.file(filename, applyReplacementsSinglePass(xmlStr, replacements));
    }
  }

  // Generate output DOCX
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

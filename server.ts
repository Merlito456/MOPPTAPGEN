import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { SAMPLE_ONE_TSSR, SAMPLE_ERICSSON_FTTH } from './src/data/sampleTssrs.ts';
import { parseFileNameMetadata, synthesizeSpecsFromText, mapSolutionToEquipment } from './src/utils/pdfExtractor.ts';
import type { OfficialMopSpecs } from './src/types/mop.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve public templates folder statically so fetch('/templates/...') works in dev and prod
app.use('/templates', express.static(path.join(__dirname, 'public', 'templates')));

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize Google GenAI client with required telemetry header
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Extraction API
app.post('/api/extract-tssr', async (req, res) => {
  try {
    const {
      fileBase64,
      extractedText = '',
      mimeType,
      fileName = '',
      formatHint = 'AUTO_DETECT',
    } = req.body;

    const baseSpecs = synthesizeSpecsFromText(fileName, extractedText, formatHint as any);

    // If Gemini is available and extracted text or small base64 is provided
    if (ai && (extractedText || fileBase64)) {
      try {
        // Send a comprehensive excerpt up to 60,000 characters to capture rectifier & power tapping pages
        let textSample = '';
        if (extractedText) {
          if (extractedText.length <= 60000) {
            textSample = extractedText;
          } else {
            // First 20,000 chars (Page 1 General Info & overview) + Power & Rectifier sections
            const head = extractedText.slice(0, 20000);
            const tail = extractedText.slice(20000);
            // Search tail for rectifier and power tapping sections
            const powerMatches = tail.match(/(?:(?:PAGE\s*\d+|SECTION|ANNEX)[\s\S]{0,200}?(?:RECTIFIER|POWER|DCPS|BREAKER|TAPPING|LOAD\s*SCHEDULE|FUSE)[\s\S]{1,4000})/gi);
            const powerSections = powerMatches ? powerMatches.slice(0, 8).join('\n...\n') : tail.slice(0, 40000);
            textSample = `${head}\n\n--- [SURVEY POWER & RECTIFIER SECTIONS] ---\n${powerSections}`;
          }
        }

        const prompt = `You are a Senior Telecommunications Power & Infrastructure Engineer specializing in Method of Procedure (MOP) documentation for commercial power tapping.
Analyze this uploaded Technical Site Survey Report (TSSR) document/text for telecommunications power tapping:
${textSample ? `\n\n--- EXTRACTED TSSR TEXT EXCERPT ---\n${textSample}\n--- END EXCERPT ---\n` : ''}
Filename: "${fileName}"

CRITICAL REQUIREMENT 1 - PAGE 1 GENERAL INFORMATION TABLE:
Examine the General Information table on the first page:
- PROJECT (e.g. "FTTH HORIZONTAL")
- SCOPE (e.g. "NEW BUILD")
- SOLUTION: CRITICAL OLT HARDWARE TYPE - Must be extracted directly from the "SOLUTION" row in the Page 1 General Information table:
  * "MF2 – 1 CARD" or "MF2 - 1 CARD" or "MF-2" -> equipmentModel MUST be "Nokia Lightspan MF-2", oltLabel MUST be "OLT MF-2".
  * "DF-16M" or "DF16" -> equipmentModel MUST be "Nokia Lightspan DF-16M", oltLabel MUST be "OLT DF-16M".
  * "FX-4" or "FX4" -> equipmentModel MUST be "Nokia Lightspan FX-4", oltLabel MUST be "OLT FX-4".
  Do NOT confuse or output FX-4 if the SOLUTION row says "MF2 – 1 CARD" or "MF-2"!
- SITE NAME (e.g. "SALUNA" or "KIMADZILCARMENCOT" or "PAGATPATCDOMISOR")
- PLAID: CRITICAL REQUIREMENT - MUST BE EXTRACTED DIRECTLY FROM THE "PLAID" ROW/CELL IN THE FIRST PAGE GENERAL INFORMATION TABLE (e.g. "MIN394" or "MIN2183"). Do NOT extract or guess PLAID from the filename, and do NOT use an ID from other pages or old benchmarks.
- TERRITORY (e.g. "T7")
- REGION (e.g. "MINDANAO")
- SITE ADDRESS (e.g. "MIDSAYAP, COTABATO (NORTH COTABATO)")
- TOWERCO (e.g. "FTAP" or "PHILTOWER")

CRITICAL REQUIREMENT 2 - RECTIFIER SYSTEM (RS) & 2 RS DETECTION:
Carefully detect whether the site has 1 or 2 Rectifier Systems (RS):
- Look for mentions of "RS 1" and "RS 2", "RS1" and "RS2", "Rectifier 1" and "Rectifier 2", "DCPS 1" and "DCPS 2", "2 Rectifiers", "Two Rectifiers", or two separate load schedules / rectifier photos / cabinets.
- If there are 2 Rectifiers on site: set "total_rectifiers": 2, "has2Rectifiers": true.
- If only 1 Rectifier is on site: set "total_rectifiers": 1, "has2Rectifiers": false.
- Determine tapping_mode:
  * "Main + RDNT – Separate Rectifiers": If Main is tapped on RS1 (Rectifier 1) and Redundant (RDNT) is tapped on RS2 (Rectifier 2).
  * "Main + RDNT – Same Rectifier": If both Main and Redundant fuses are tapped on the same rectifier (RS1).
  * "Single Tapping Point": If only a single main breaker is tapped.
- Extract RS1 details:
  * "rs1_name": Brand & Model (e.g. "Eltek Flatpack 1", "Vertiv NetSure 1", "Delta DPR 1", "Huawei TP48200B")
  * "rs1_load": MAIN breaker/fuse (e.g. "F1", "F8", "F16", "L3")
  * "rs1_ampere": Amperage rating (e.g. "16A", "10A")
  * "rs1_rdnt_load": RDNT breaker/fuse if same rectifier (e.g. "F2", "F9", "F17")
  * "rs1_rdnt_ampere": RDNT amperage rating (e.g. "16A")
- Extract RS2 details (if 2 rectifiers present):
  * "rs2_name": RS2 Brand & Model (e.g. "Eltek Flatpack 2", "Vertiv NetSure 2", "Delta DPR 2")
  * "rs2_load": RDNT breaker/fuse if separate rectifiers
  * "rs2_ampere": Breaker rating (e.g. "16A")

Determine the exact format:
1. "ONE_TSSR" format (e.g., standard telecom cell site / macro build TSSR like MIN2250 PAGATPATCDOMISOR).
   Output name pattern: "MOP_{SiteName}_{SiteID}.docx"
2. "ERICSSON_FTTH" format (e.g., FTTH Horizontal Rollout like NOKIA_FTTH HORIZONTAL_SALUNA_MIN394_TSSR).
   Output name pattern: "MOP_POWERTAPPING_FTTH_HORIZONTAL_{Territory}_{SiteName}_{SiteID}.docx"

Return JSON with this exact schema:
{
  "format": "ONE_TSSR" or "ERICSSON_FTTH",
  "plaid": "string (e.g. MIN394 - MUST BE FROM THE PAGE 1 PLAID ENTRY)",
  "siteId": "string (same as plaid)",
  "siteName": "string",
  "solution": "string (e.g. MF2 – 1 CARD)",
  "equipmentModel": "string (e.g. Nokia Lightspan MF-2 or Nokia Lightspan DF-16M)",
  "oltLabel": "string (e.g. OLT MF-2 or OLT DF-16M)",
  "territory": "string (e.g. T7)",
  "region": "string (e.g. MINDANAO)",
  "siteAddress": "string",
  "towerco": "string",
  "project": "string",
  "scope": "string",
  "total_rectifiers": 1 or 2,
  "has2Rectifiers": boolean,
  "tapping_mode": "Single Tapping Point" or "Main + RDNT – Same Rectifier" or "Main + RDNT – Separate Rectifiers",
  "rs1_name": "string (e.g. Eltek Flatpack 1 or RECTIFIER 1 – ELTEK)",
  "rs1_load": "string (e.g. F1 or F16)",
  "rs1_ampere": "string (e.g. 16A)",
  "rs1_rdnt_load": "string (e.g. F2 or F17)",
  "rs1_rdnt_ampere": "string (e.g. 16A)",
  "rs2_name": "string (e.g. Eltek Flatpack 2)",
  "rs2_load": "string (e.g. L6 or F16)",
  "rs2_ampere": "string (e.g. 16A)",
  "rsDetectionNotes": "string (e.g. Detected 2 rectifiers on site: RS1 and RS2)",
  "rectifierSystem": "string (same as rs1_name)",
  "fuseMain": "string (same as rs1_load)",
  "fuseRedundant": "string (same as rs1_rdnt_load or rs2_load)",
  "fuseAmperage": "string (e.g. 16A)",
  "targetImplementationDates": "string"
}`;

        const parts: any[] = [{ text: prompt }];
        if (fileBase64 && !extractedText && fileBase64.length < 8000000) {
          parts.unshift({
            inlineData: {
              mimeType: mimeType || 'application/pdf',
              data: fileBase64.replace(/^data:[^;]+;base64,/, ''),
            },
          });
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout, using rapid synthesized specs')), 8500)
        );

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const textOutput = response.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          if (parsed.plaid || parsed.siteId) {
            const finalPlaid = (parsed.plaid || parsed.siteId).trim().toUpperCase();
            baseSpecs.plaid = finalPlaid;
            baseSpecs.siteId = finalPlaid;
          }
          if (parsed.siteName) {
            const finalSiteName = String(parsed.siteName).trim().toUpperCase();
            baseSpecs.siteName = finalSiteName;
            baseSpecs.site_name = finalSiteName;
          }
          if (parsed.solution) {
            baseSpecs.solution = parsed.solution;
            // Strict ground truth: Map solution directly to equipment model
            const mappedEq = mapSolutionToEquipment(parsed.solution);
            baseSpecs.equipment = mappedEq.equipment;
            baseSpecs.equipmentModel = mappedEq.equipment;
            baseSpecs.olt_label_custom = mappedEq.oltLabel;
          } else if (parsed.equipmentModel) {
            const mappedEq = mapSolutionToEquipment(parsed.equipmentModel);
            baseSpecs.equipmentModel = mappedEq.equipment;
            baseSpecs.equipment = mappedEq.equipment;
            baseSpecs.olt_label_custom = parsed.oltLabel || mappedEq.oltLabel;
          }
          if (baseSpecs.siteName && baseSpecs.siteId) {
            baseSpecs.siteLocationSystem = `${baseSpecs.siteName}_${baseSpecs.siteId}`;
          }
          if (parsed.territory) baseSpecs.territory = parsed.territory;
          if (parsed.region) baseSpecs.region = parsed.region;
          if (parsed.siteAddress) baseSpecs.siteAddress = parsed.siteAddress;
          if (parsed.towerco) baseSpecs.towerco = parsed.towerco;
          if (parsed.project) baseSpecs.project = parsed.project;
          if (parsed.scope) baseSpecs.scope = parsed.scope;

          // 2 RS & Tapping Mode detection mapping
          const isTwoRs = parsed.has2Rectifiers === true || parsed.total_rectifiers === 2;
          if (isTwoRs) {
            baseSpecs.total_rectifiers = 2;
            baseSpecs.detected_2_rs = true;
            baseSpecs.rs_detection_notes = parsed.rsDetectionNotes || 'Detected 2 Rectifiers (RS1 & RS2) on site.';
          } else if (parsed.total_rectifiers === 1) {
            baseSpecs.total_rectifiers = 1;
            baseSpecs.detected_2_rs = false;
          }

          if (parsed.tapping_mode) {
            baseSpecs.tapping_mode = parsed.tapping_mode;
          }

          // Ensure rs_entries array has at least 2 entries initialized
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

          // Map RS1 fields
          const rs1Name = parsed.rs1_name || parsed.rectifierSystem;
          if (rs1Name) {
            baseSpecs.rectifierSystem = rs1Name;
            baseSpecs.rs_entries[0].name = rs1Name;
          }
          const rs1Load = parsed.rs1_load || parsed.fuseMain;
          if (rs1Load) {
            baseSpecs.fuseMain = rs1Load;
            baseSpecs.rs_entries[0].load = rs1Load;
          }
          const rs1Amp = parsed.rs1_ampere || parsed.fuseAmperage;
          if (rs1Amp) {
            baseSpecs.fuseAmperage = rs1Amp;
            baseSpecs.rs_entries[0].ampere = rs1Amp;
          }
          if (parsed.rs1_rdnt_load || parsed.fuseRedundant) {
            const rdntVal = parsed.rs1_rdnt_load || parsed.fuseRedundant;
            baseSpecs.fuseRedundant = rdntVal;
            baseSpecs.rs_entries[0].rdnt_load = rdntVal;
          }
          if (parsed.rs1_rdnt_ampere) {
            baseSpecs.rs_entries[0].rdnt_ampere = parsed.rs1_rdnt_ampere;
          }

          // Map RS2 fields if 2 RS
          if (baseSpecs.total_rectifiers >= 2) {
            const rs2Name = parsed.rs2_name || (rs1Name ? `${rs1Name.replace(/\s*1\b/i, '')} 2` : 'Eltek Flatpack 2');
            baseSpecs.rs_entries[1].name = rs2Name;
            if (parsed.rs2_load) {
              baseSpecs.rs_entries[1].load = parsed.rs2_load;
              if (baseSpecs.tapping_mode === 'Main + RDNT – Separate Rectifiers') {
                baseSpecs.fuseRedundant = parsed.rs2_load;
              }
            }
            if (parsed.rs2_ampere) {
              baseSpecs.rs_entries[1].ampere = parsed.rs2_ampere;
            }
          }

          if (parsed.targetImplementationDates) {
            baseSpecs.target_datetime = parsed.targetImplementationDates;
            baseSpecs.targetImplementationDates = parsed.targetImplementationDates;
          }

          baseSpecs.siteLocationSystem = `${baseSpecs.site_name}_${baseSpecs.plaid}`;
          const terr = baseSpecs.territory || 'T7';
          if (baseSpecs.format === 'ERICSSON_FTTH') {
            baseSpecs.generatedMopFileName = `MOP_POWERTAPPING_FTTH_HORIZONTAL_${terr}_${baseSpecs.site_name}_${baseSpecs.plaid}.docx`;
          } else {
            baseSpecs.generatedMopFileName = `MOP_${baseSpecs.site_name}_${baseSpecs.plaid}.docx`;
          }
          return res.json({ success: true, specs: baseSpecs, source: 'gemini' });
        }
      } catch (geminiError: any) {
        console.warn('Gemini extraction bypassed/timed-out:', geminiError?.message || geminiError);
      }
    }

    return res.json({ success: true, specs: baseSpecs, source: 'instant_template_engine' });
  } catch (err: any) {
    console.error('Extraction handler failed:', err);
    return res.status(500).json({ error: err.message || 'Failed to process TSSR file' });
  }
});

// Configure Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();

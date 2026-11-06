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
        const textSample = extractedText ? extractedText.slice(0, 15000) : '';
        const prompt = `You are a Senior Telecommunications Power & Infrastructure Engineer specializing in Method of Procedure (MOP) documentation for commercial power tapping.
Analyze this uploaded Technical Site Survey Report (TSSR) document/text for telecommunications power tapping:
${textSample ? `\n\n--- EXTRACTED TSSR TEXT EXCERPT ---\n${textSample}\n--- END EXCERPT ---\n` : ''}
Filename: "${fileName}"

CRITICAL REQUIREMENT - PAGE 1 GENERAL INFORMATION TABLE:
Examine the General Information table on the first page:
- PROJECT (e.g. "FTTH HORIZONTAL")
- SCOPE (e.g. "NEW BUILD")
- SOLUTION: CRITICAL OLT HARDWARE TYPE - Must be extracted directly from the "SOLUTION" row in the Page 1 General Information table:
  * "MF2 – 1 CARD" or "MF2 - 1 CARD" or "MF-2" -> equipmentModel MUST be "Nokia Lightspan MF-2", oltLabel MUST be "OLT MF-2".
  * "DF-16M" or "DF16" -> equipmentModel MUST be "Nokia Lightspan DF-16M", oltLabel MUST be "OLT DF-16M".
  * "FX-4" or "FX4" -> equipmentModel MUST be "Nokia Lightspan FX-4", oltLabel MUST be "OLT FX-4".
  Do NOT confuse or output FX-4 if the SOLUTION row says "MF2 – 1 CARD" or "MF-2"!
- SITE NAME (e.g. "SALUNA" or "KIMADZILCARMENCOT")
- PLAID: CRITICAL REQUIREMENT - MUST BE EXTRACTED DIRECTLY FROM THE "PLAID" ROW/CELL IN THE FIRST PAGE GENERAL INFORMATION TABLE (e.g. "MIN394" or "MIN2183"). Do NOT extract or guess PLAID from the filename, and do NOT use an ID from other pages or old benchmarks.
- TERRITORY (e.g. "T7")
- REGION (e.g. "MINDANAO")
- SITE ADDRESS (e.g. "MIDSAYAP, COTABATO (NORTH COTABATO)")
- TOWERCO (e.g. "FTAP" or "PHILTOWER")

Determine the exact format:
1. "ONE_TSSR" format (e.g., standard telecom cell site / macro build TSSR like MIN2250 PAGATPATCDOMISOR).
   Output name pattern: "MOP_{SiteName}_{SiteID}.docx"
2. "ERICSSON_FTTH" format (e.g., FTTH Horizontal Rollout like NOKIA_FTTH HORIZONTAL_SALUNA_MIN394_TSSR).
   Output name pattern: "MOP_POWERTAPPING_FTTH_HORIZONTAL_{Territory}_{SiteName}_{SiteID}.docx"

Extract and populate:
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
  "rectifierSystem": "string (e.g. Eltek Flatpack 1 or RECTIFIER 1 – ELTEK)",
  "fuseMain": "string (e.g. F1 or F16)",
  "fuseRedundant": "string (e.g. F2 or F17)",
  "fuseAmperage": "16A",
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
          setTimeout(() => reject(new Error('AI timeout, using rapid synthesized specs')), 4500)
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

          if (parsed.rectifierSystem) {
            baseSpecs.rectifierSystem = parsed.rectifierSystem;
            if (baseSpecs.rs_entries.length > 0) baseSpecs.rs_entries[0].name = parsed.rectifierSystem;
          }
          if (parsed.fuseMain && baseSpecs.rs_entries.length > 0) {
            baseSpecs.fuseMain = parsed.fuseMain;
            baseSpecs.rs_entries[0].load = parsed.fuseMain;
          }
          if (parsed.fuseRedundant && baseSpecs.rs_entries.length > 0) {
            baseSpecs.fuseRedundant = parsed.fuseRedundant;
            baseSpecs.rs_entries[0].rdnt_load = parsed.fuseRedundant;
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

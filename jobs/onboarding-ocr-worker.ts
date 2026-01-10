import { Worker, Job } from '@/lib/queue';
import { connectMongo } from '@/lib/mongodb-unified';
import { logger } from '@/lib/logger';
import { VerificationDocument } from '@/server/models/onboarding/VerificationDocument';
import { VerificationLog } from '@/server/models/onboarding/VerificationLog';

type OcrJob = { docId: string; onboardingCaseId: string };

const QUEUE_NAME = process.env.OCR_QUEUE_NAME || 'onboarding-ocr';

/**
 * OCR Provider Configuration
 * 
 * Supported providers:
 * - OCR_PROVIDER=azure (Azure Computer Vision)
 * - OCR_PROVIDER=google (Google Cloud Vision)
 * - OCR_PROVIDER=simulation (default, for development)
 * 
 * Required environment variables per provider:
 * - Azure: AZURE_VISION_ENDPOINT, AZURE_VISION_KEY
 * - Google: GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 */
type OcrProvider = 'azure' | 'google' | 'simulation';

interface OcrResult {
  extractedText: string;
  fields: Record<string, string>;
  confidence: number;
  provider: OcrProvider;
}

function getOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER as OcrProvider;
  if (provider === 'azure' && process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY) {
    return 'azure';
  }
  if (provider === 'google' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return 'google';
  }
  return 'simulation';
}

async function performOcr(documentUrl: string, documentType: string): Promise<OcrResult> {
  const provider = getOcrProvider();

  switch (provider) {
    case 'azure':
      return performAzureOcr(documentUrl, documentType);
    case 'google':
      return performGoogleOcr(documentUrl, documentType);
    case 'simulation':
    default:
      return performSimulatedOcr(documentType);
  }
}

/**
 * Azure Computer Vision OCR
 * BLOCKED: Requires AZURE_VISION_ENDPOINT and AZURE_VISION_KEY
 */
async function performAzureOcr(documentUrl: string, documentType: string): Promise<OcrResult> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT!;
  const key = process.env.AZURE_VISION_KEY!;

  try {
    // Azure Computer Vision Read API
    const response = await fetch(`${endpoint}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': key,
      },
      body: JSON.stringify({ url: documentUrl }),
    });

    if (!response.ok) {
      logger.error('[OnboardingOCR] Azure API error', { 
        status: response.status,
        documentType,
      });
      return performSimulatedOcr(documentType);
    }

    // Get operation location and poll for results
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      throw new Error('No operation location returned');
    }

    // Poll for completion with exponential backoff (configurable, ~60s total wait)
    const maxAttempts = 12; // 12 attempts
    const baseIntervalMs = 1000; // Start with 1s
    const maxIntervalMs = 10000; // Cap at 10s
    let result = null;
    let elapsedMs = 0;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 10s (capped), 10s, ...
      const intervalMs = Math.min(baseIntervalMs * Math.pow(2, attempt), maxIntervalMs);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      elapsedMs += intervalMs;
      
      const pollResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': key },
      });
      const pollData = await pollResponse.json();
      
      if (pollData.status === 'succeeded') {
        result = pollData;
        break;
      } else if (pollData.status === 'failed') {
        throw new Error(`OCR operation failed after ${attempt + 1} attempts (${elapsedMs}ms): ${pollData.error?.message || 'Unknown error'}`);
      }
      // 'running' or 'notStarted' - continue polling
    }

    if (!result) {
      throw new Error(`OCR operation timed out after ${maxAttempts} attempts (${elapsedMs}ms elapsed). Consider increasing maxAttempts or intervals.`);
    }

    // Extract text from Azure response
    const extractedText = result.analyzeResult?.readResults
      ?.flatMap((r: { lines?: Array<{ text: string }> }) => r.lines?.map((l: { text: string }) => l.text) || [])
      .join('\n') || '';

    return {
      extractedText,
      fields: extractFieldsFromText(extractedText, documentType),
      confidence: 0.95,
      provider: 'azure',
    };
  } catch (error) {
    logger.error('[OnboardingOCR] Azure OCR failed, falling back to simulation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return performSimulatedOcr(documentType);
  }
}

/**
 * Google Cloud Vision OCR
 * Requires: GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 * 
 * @see https://cloud.google.com/vision/docs/ocr
 */
async function performGoogleOcr(documentUrl: string, documentType: string): Promise<OcrResult> {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsPath) {
    logger.warn('[OnboardingOCR] Google Vision credentials not configured - falling back to simulation', {
      documentType,
      hint: 'Set GOOGLE_APPLICATION_CREDENTIALS to path of service account JSON',
    });
    return performSimulatedOcr(documentType);
  }

  try {
    // Dynamic import to avoid requiring the package at startup if not used
    // Types are not available without installing the package
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const vision = require('@google-cloud/vision') as any;
    const client = new vision.ImageAnnotatorClient();

    // Google Vision can handle URLs directly
    const [result] = await client.textDetection(documentUrl);
    const detections = result?.textAnnotations as Array<{ description?: string }> | undefined;
    
    if (!detections || detections.length === 0) {
      logger.warn('[OnboardingOCR] Google Vision returned no text', { documentType });
      return {
        extractedText: '',
        fields: {},
        confidence: 0,
        provider: 'google',
      };
    }

    // First annotation contains the full extracted text
    const extractedText = detections[0]?.description || '';
    
    // Calculate confidence from individual word confidences (if available)
    // Use type-safe extraction with proper null checks
    const fullTextAnnotation = result?.fullTextAnnotation as {
      pages?: Array<{
        blocks?: Array<{
          paragraphs?: Array<{
            words?: Array<{ confidence?: number }>;
          }>;
        }>;
      }>;
    } | undefined;
    
    const confidences: number[] = [];
    if (fullTextAnnotation?.pages) {
      for (const page of fullTextAnnotation.pages) {
        for (const block of page.blocks || []) {
          for (const para of block.paragraphs || []) {
            for (const word of para.words || []) {
              if (typeof word.confidence === 'number') {
                confidences.push(word.confidence);
              }
            }
          }
        }
      }
    }
    
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0.85; // Default confidence if not available

    logger.info('[OnboardingOCR] Google Vision OCR completed', {
      documentType,
      textLength: extractedText.length,
      confidence: avgConfidence,
    });

    return {
      extractedText,
      fields: extractFieldsFromText(extractedText, documentType),
      confidence: avgConfidence,
      provider: 'google',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a missing module error
    if (errorMessage.includes("Cannot find module '@google-cloud/vision'")) {
      logger.error('[OnboardingOCR] @google-cloud/vision package not installed', {
        documentType,
        action: 'Run: pnpm add @google-cloud/vision',
      });
    } else {
      logger.error('[OnboardingOCR] Google Vision OCR failed', {
        error: errorMessage,
        documentType,
      });
    }
    
    // Fall back to simulation on any error
    return performSimulatedOcr(documentType);
  }
}

/**
 * Simulated OCR for development/testing
 */
async function performSimulatedOcr(documentType: string): Promise<OcrResult> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  const simulatedFields: Record<string, Record<string, string>> = {
    NATIONAL_ID: {
      id_number: '1234567890',
      name_ar: 'محمد عبدالله',
      name_en: 'Mohammed Abdullah',
      dob: '1990-01-15',
      nationality: 'Saudi',
    },
    COMMERCIAL_REGISTER: {
      cr_number: '1010123456',
      company_name_ar: 'شركة المثال للتجارة',
      company_name_en: 'Example Trading Company',
      issue_date: '2020-05-01',
      expiry_date: '2025-05-01',
    },
    BANK_LETTER: {
      bank_name: 'Al Rajhi Bank',
      iban: 'SA0380000000000000000000',
      account_holder: 'Example Company',
    },
    DEFAULT: {
      text: 'Document text placeholder',
    },
  };

  const fields = simulatedFields[documentType] || simulatedFields.DEFAULT;

  return {
    extractedText: Object.values(fields).join('\n'),
    fields,
    confidence: 0.9,
    provider: 'simulation',
  };
}

/**
 * Extract structured fields from OCR text based on document type
 */
function extractFieldsFromText(text: string, _documentType: string): Record<string, string> {
  const fields: Record<string, string> = {};
  
  // Basic field extraction patterns (extend based on document types)
  const patterns: Record<string, RegExp> = {
    id_number: /(?:رقم الهوية|ID|National ID)[:\s]*(\d{10})/i,
    cr_number: /(?:رقم السجل|CR|Commercial Register)[:\s]*(\d{10})/i,
    iban: /(?:IBAN|آيبان)[:\s]*(SA\d{22})/i,
    date: /(\d{4}[-/]\d{2}[-/]\d{2})/i, // Fixed: removed global flag for match[1] to work
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      fields[key] = match[1];
    }
  }

  return fields;
}

function buildWorker(): Worker<OcrJob> | null {
  return new Worker<OcrJob>(
    QUEUE_NAME,
    async (job: Job<OcrJob>) => {
      await connectMongo();
      const doc = await VerificationDocument.findById(job.data.docId);
      if (!doc) {
        logger.warn('[OnboardingOCR] Document not found', { jobId: job.id, docId: job.data.docId });
        return;
      }

      const provider = getOcrProvider();
      logger.info('[OnboardingOCR] Processing document', {
        jobId: job.id,
        docId: doc._id.toString(),
        documentType: doc.document_type_code,
        provider,
      });

      // Perform OCR using configured provider
      const ocrResult = await performOcr(
        doc.file_storage_key || '',
        doc.document_type_code || 'DEFAULT',
      );

      // Update document with OCR results
      doc.ocr_confidence = ocrResult.confidence;
      doc.ocr_data = {
        extracted_text: ocrResult.extractedText,
        fields: ocrResult.fields,
        provider: ocrResult.provider,
        processedAt: new Date().toISOString(),
      };
      doc.status = 'UNDER_REVIEW';
      await doc.save();

      await VerificationLog.create({
        document_id: doc._id,
        action: 'AUTO_CHECK',
        performed_by_id: undefined,
        details: {
          jobId: job.id,
          confidence: doc.ocr_confidence,
          provider: ocrResult.provider,
          fieldsExtracted: Object.keys(ocrResult.fields).length,
        },
      });

      logger.info('[OnboardingOCR] Processed document', {
        jobId: job.id,
        docId: doc._id.toString(),
        provider: ocrResult.provider,
        confidence: ocrResult.confidence,
      });
    }
  );
}

export function startOnboardingOcrWorker(): Worker<OcrJob> | null {
  return buildWorker();
}

if (require.main === module) {
  const worker = startOnboardingOcrWorker();
  if (worker) {
    logger.info('[OnboardingOCR] Worker started', { queue: QUEUE_NAME });
  } else {
    // eslint-disable-next-line no-console
    logger.error('onboarding_ocr:worker_not_started', {
      reason: 'worker initialization failed',
    });
    process.exit(1);
  }
}


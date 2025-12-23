import mongoose from 'mongoose';
import { DocumentType } from '@/server/models/onboarding/DocumentType';
import { DocumentProfile } from '@/server/models/onboarding/DocumentProfile';

const isProdLike =
  process.env.NODE_ENV === 'production' || process.env.CI === 'true';
if (isProdLike) {
  console.error(
    'Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production.',
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== '1') {
  console.error('Set ALLOW_SEED=1 to run seed scripts in non-production.');
  process.exit(1);
}

// Type guard for MongoDB bulk write errors
interface MongoWriteError {
  code?: number;
  writeErrors?: Array<{ code?: number }>;
}

function isMongoWriteError(error: unknown): error is MongoWriteError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'writeErrors' in error)
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!isMongoWriteError(error)) return false;
  return (
    error.code === 11000 ||
    (Array.isArray(error.writeErrors) &&
      error.writeErrors.every((e) => e?.code === 11000))
  );
}

async function seedOnboarding() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);

  await DocumentType.insertMany(
    [
      {
        code: 'NATIONAL_ID',
        name_en: 'National ID',
        name_ar: 'بطاقة الهوية الوطنية',
        applies_to: ['TENANT', 'PROPERTY_OWNER'],
        is_mandatory: true,
        requires_expiry: false,
        max_file_size_mb: 10,
        allowed_mime_types: ['image/jpeg', 'image/png', 'application/pdf'],
        review_required: true,
      },
      {
        code: 'CR_LICENSE',
        name_en: 'Commercial Register',
        name_ar: 'السجل التجاري',
        applies_to: ['VENDOR', 'OWNER', 'AGENT'],
        is_mandatory: true,
        requires_expiry: true,
        max_file_size_mb: 10,
        allowed_mime_types: ['application/pdf'],
        review_required: true,
      },
      {
        code: 'VAT_CERT',
        name_en: 'VAT Certificate',
        name_ar: 'شهادة ضريبة القيمة المضافة',
        applies_to: ['VENDOR', 'OWNER'],
        is_mandatory: true,
        requires_expiry: true,
        max_file_size_mb: 10,
        allowed_mime_types: ['application/pdf'],
        review_required: true,
      },
      {
        code: 'IBAN_CERT',
        name_en: 'IBAN Certificate',
        name_ar: 'شهادة IBAN',
        applies_to: ['VENDOR'],
        is_mandatory: true,
        requires_expiry: false,
        max_file_size_mb: 5,
        allowed_mime_types: ['application/pdf', 'image/jpeg'],
        review_required: true,
      },
    ],
    { ordered: false },
  ).catch((error: { code?: number; writeErrors?: Array<{ code?: number }> }) => {
    // Ignore duplicate key errors but surface anything else
    const isDup =
      error?.code === 11000 ||
      (Array.isArray(error?.writeErrors) &&
        error.writeErrors.every((e) => e?.code === 11000));
    if (!isDup) {
      throw error;
    }
  });

  await DocumentProfile.insertMany(
    [
      { role: 'TENANT', country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
      { role: 'VENDOR', country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT', 'IBAN_CERT'] },
      { role: 'AGENT', country: 'SA', required_doc_codes: ['CR_LICENSE'] },
      { role: 'PROPERTY_OWNER', country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
      { role: 'OWNER', country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT'] },
    ],
    { ordered: false },
  ).catch((error: unknown) => {
    // Ignore duplicate key errors but surface anything else
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  });

  await mongoose.disconnect();
}

if (require.main === module) {
  seedOnboarding()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Onboarding seed complete');
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Onboarding seed failed', err);
      process.exit(1);
    });
}

export default seedOnboarding;

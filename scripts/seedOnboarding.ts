import mongoose from 'mongoose';
import { DocumentType } from '@/models/onboarding/DocumentType';
import { DocumentProfile } from '@/models/onboarding/DocumentProfile';

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
        applies_to: ['VENDOR', 'CUSTOMER', 'AGENT'],
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
        applies_to: ['VENDOR', 'CUSTOMER'],
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
  ).catch((error: any) => {
    // Ignore duplicate key errors but surface anything else
    const isDup =
      error?.code === 11000 ||
      (Array.isArray(error?.writeErrors) &&
        error.writeErrors.every((e: any) => e?.code === 11000));
    if (!isDup) {
      throw error;
    }
  });

  await DocumentProfile.insertMany(
    [
      { role: 'TENANT', country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
      { role: 'VENDOR', country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT', 'IBAN_CERT'] },
      { role: 'CUSTOMER', country: 'SA', required_doc_codes: ['CR_LICENSE', 'VAT_CERT'] },
      { role: 'AGENT', country: 'SA', required_doc_codes: ['CR_LICENSE'] },
      { role: 'PROPERTY_OWNER', country: 'SA', required_doc_codes: ['NATIONAL_ID'] },
    ],
    { ordered: false },
  ).catch((error: any) => {
    // Ignore duplicate key errors but surface anything else
    const isDup =
      error?.code === 11000 ||
      (Array.isArray(error?.writeErrors) &&
        error.writeErrors.every((e: any) => e?.code === 11000));
    if (!isDup) {
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

'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

interface JobApplicationFormProps {
  jobId: string;
}

type FieldErrors = Partial<Record<
  'fullName'|'email'|'phone'|'linkedin'|'experience'|'resume'|'general',
  string
>>;

/**
 * Drop-in: robust validation + i18n + stable testids + proper success navigation
 */

/**
 * Drop-in: robust validation + i18n + stable testids + proper success navigation
 */
export function JobApplicationForm({ jobId }: JobApplicationFormProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [resumeKey, setResumeKey] = useState<string | null>(null);
  const [resumeStatus, setResumeStatus] = useState<'pending' | 'clean' | 'infected' | 'error' | null>(null);
  // Honeypot (bots only)
  const honeypotRef = useRef<HTMLInputElement>(null);

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  // Poll AV status after upload so UI can surface clean/infected badge
  useEffect(() => {
    if (!resumeKey || resumeStatus !== 'pending') return undefined;
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/upload/scan-status?key=${encodeURIComponent(resumeKey)}`);
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (typeof json.status === 'string' && ['pending', 'clean', 'infected', 'error'].includes(json.status)) {
          setResumeStatus(json.status as typeof resumeStatus);
        }
      } catch {
        /* ignore */
      }
    }, 7000);
    return () => window.clearInterval(interval);
  }, [resumeKey, resumeStatus]);

  const focusFirstError = (form: HTMLFormElement, fieldOrder: string[], fieldErrors: FieldErrors) => {
    for (const f of fieldOrder) {
      if (fieldErrors[f as keyof FieldErrors]) {
        const el = form.querySelector(`[name="${f}"]`) as HTMLElement | null;
        if (el?.focus) el.focus();
        break;
      }
    }
  };

  const validate = (fd: FormData): FieldErrors => {
    const next: FieldErrors = {};

    const fullName = String(fd.get('fullName') || '').trim();
    const email = String(fd.get('email') || '').trim().toLowerCase();
    const phone = String(fd.get('phone') || '').trim();
    const linkedin = String(fd.get('linkedin') || '').trim();
    const experience = String(fd.get('experience') || '').trim();
    const resume = fd.get('resume');

    if (!fullName) next.fullName = t('careers.fullNameRequired', 'Full name is required');

    if (!email) {
      next.email = t('careers.emailRequired', 'Email is required');
    } else if (!emailRx.test(email)) {
      next.email = t('careers.emailInvalid', 'Please enter a valid email address');
    }

    if (phone) {
      // Parse phone without assuming country - libphonenumber-js will detect from format
      // If phone starts with +, it includes country code; otherwise try common defaults
      const pn = parsePhoneNumberFromString(phone);
      if (!pn || !pn.isValid()) {
        next.phone = t('careers.phoneInvalid', 'Please enter a valid phone number with country code (e.g., +9665XXXXXXXX)');
      } else {
        // Normalize for backend (append an extra field)
        fd.set('phoneE164', pn.number);
      }
    }

    if (linkedin) {
      try {
        const u = new URL(linkedin);
        if (!/^(?:www\.)?linkedin\.com$/i.test(u.hostname.replace(/^.*?linkedin\./i, 'linkedin.'))) {
          next.linkedin = t('careers.linkedinInvalid', 'Please provide a valid LinkedIn profile URL');
        }
      } catch {
        next.linkedin = t('careers.linkedinInvalid', 'Please provide a valid LinkedIn profile URL');
      }
    }

    if (experience) {
      const n = Number(experience);
      if (!Number.isFinite(n) || n < 0 || n > 50) {
        next.experience = t('careers.experienceInvalid', 'Years of experience must be between 0 and 50');
      }
    }

    if (!(resume instanceof File) || !resume || resume.size === 0) {
      next.resume = t('careers.resumeRequired', 'Please upload your CV/Resume (PDF)');
    } else {
      const mimeOk = resume.type === 'application/pdf' || resume.type === 'application/x-pdf';
      const extOk = resume.name.toLowerCase().endsWith('.pdf');
      if (!mimeOk && !extOk) {
        next.resume = t('careers.resumeType', 'Resume must be a PDF file');
      } else if (resume.size > 5 * 1024 * 1024) {
        next.resume = t('careers.resumeSize', 'Resume file size must be less than 5MB');
      }
    }

    return next;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});

    try {
      // Honeypot: bots fill it -> block
      if (honeypotRef.current?.value) {
        setErrors({ general: t('careers.spamDetected', 'Submission blocked (suspected bot).') });
        return;
      }

      const formEl = e.currentTarget;
      const formData = new FormData(formEl);

      // Basic normalization
      formData.set('jobId', jobId);
      const skills = String(formData.get('skills') || '').trim();
      if (skills) formData.set('skills', skills.replace(/\s*,\s*/g, ', ')); // clean commas

      const fieldErrs = validate(formData);
      if (Object.keys(fieldErrs).length) {
        setErrors(fieldErrs);
        focusFirstError(formEl, ['fullName', 'email', 'phone', 'linkedin', 'experience', 'resume'], fieldErrs);
        return;
      }

      const resume = formData.get('resume');
      if (resume instanceof File) {
        let uploadedViaPresign = false;
        try {
          const presignRes = await fetch('/api/files/resumes/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: resume.name,
              contentType: resume.type || 'application/pdf',
              size: resume.size,
            }),
          });

          if (presignRes.ok) {
            const presign = await presignRes.json();
            const putHeaders: Record<string, string> = {
              ...(presign.headers || {}),
              'Content-Type': resume.type || 'application/pdf',
            };
            const putRes = await fetch(presign.url, {
              method: 'PUT',
              headers: putHeaders,
              body: resume,
            });
            if (!putRes.ok) {
              throw new Error(t('careers.uploadFailed', 'Failed to upload resume'));
            }
            const publicUrl = String(presign.url).split('?')[0];
            formData.set('resumeKey', presign.key);
            formData.set('resumeUrl', publicUrl);
            formData.set('resumeMimeType', resume.type || 'application/pdf');
            formData.set('resumeSize', String(resume.size));
            formData.delete('resume'); // do not post the raw file
            setResumeKey(presign.key);
            setResumeStatus('pending');
            uploadedViaPresign = true;

            try {
              const statusRes = await fetch(`/api/upload/scan-status?key=${encodeURIComponent(presign.key)}`);
              if (statusRes.ok) {
                const statusJson = await statusRes.json().catch(() => ({}));
                if (typeof statusJson.status === 'string') {
                  const normalized = statusJson.status as typeof resumeStatus;
                  setResumeStatus(['pending', 'clean', 'infected', 'error'].includes(normalized || '') ? normalized : 'pending');
                }
              }
            } catch {
              /* best-effort only */
            }
          } else if (![401, 403].includes(presignRes.status)) {
            const msg = await presignRes.text().catch(() => '') || t('careers.presignFailed', 'Failed to prepare resume upload');
            throw new Error(msg);
          }
        } catch (uploadErr) {
          const msg =
            uploadErr instanceof Error ? uploadErr.message : t('careers.uploadFailed', 'Failed to upload resume');
          setErrors((prev) => ({ ...prev, general: msg }));
          toast.error(msg);
          return;
        }

        // If presign failed due to auth (401/403), fall back to posting the file directly with the form.
        if (!uploadedViaPresign) {
          setResumeStatus(null);
          setResumeKey(null);
        }
      }

      const res = await fetch(`/api/careers/apply`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      let payload: { error?: string; [key: string]: unknown } = {};
      try { payload = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        const message =
          payload?.error ||
          (res.status === 429
            ? t('careers.tooMany', 'Too many attempts. Please try again later.')
            : t('careers.applyFailed', 'Failed to submit application'));
        throw new Error(message);
      }

      toast.success(t('careers.applySuccess', "Application submitted! We'll get back to you soon."), { duration: 5000 });

      // Reset + route to jobs with a flag
      formEl.reset();
      setErrors({});
      setTimeout(() => router.push('/careers?applied=true'), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('careers.applyFailed', 'Failed to submit application');
      setErrors(prev => ({ ...prev, general: msg }));
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldCls = (hasErr?: boolean) =>
    `border p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent ${
      hasErr ? 'border-destructive focus:ring-red-500' : 'border-border'
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      encType="multipart/form-data"
      className="mt-8 bg-muted p-6 rounded-2xl"
      data-testid="job-apply-form"
    >
      <h3 className="text-xl font-semibold mb-4">{t('careers.applyNow', 'Apply Now')}</h3>

      {/* Honeypot */}
      <input ref={honeypotRef} type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="flex flex-col">
          <label htmlFor="fullName" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.fullName', 'Full Name')} <span className="text-destructive">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder={t('careers.fullNamePh', 'John Doe')}
            required
            className={fieldCls(!!errors.fullName)}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'err-fullName' : undefined}
            disabled={isSubmitting}
            data-testid="fullName"
          />
          {errors.fullName && (
            <p id="err-fullName" className="mt-1 text-xs text-destructive">{errors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label htmlFor="email" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.email', 'Email Address')} <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t('careers.emailPh', 'john@example.com')}
            required
            className={fieldCls(!!errors.email)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'err-email' : undefined}
            disabled={isSubmitting}
            data-testid="email"
          />
          {errors.email && (
            <p id="err-email" className="mt-1 text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label htmlFor="phone" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.phone', 'Phone Number')}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder={t('careers.phonePh', '+966 50 123 4567')}
            className={fieldCls(!!errors.phone)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'err-phone' : undefined}
            disabled={isSubmitting}
            data-testid="phone"
          />
          {errors.phone && (
            <p id="err-phone" className="mt-1 text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        {/* Location */}
        <div className="flex flex-col">
          <label htmlFor="location" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.location', 'Location')}
          </label>
          <input
            id="location"
            name="location"
            type="text"
            placeholder={t('careers.locationPh', 'Riyadh, Saudi Arabia')}
            className={fieldCls()}
            disabled={isSubmitting}
            data-testid="location"
          />
        </div>

        {/* Years of Experience */}
        <div className="flex flex-col">
          <label htmlFor="experience" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.experience', 'Years of Experience')}
          </label>
          <input
            id="experience"
            name="experience"
            type="number"
            min={0}
            max={50}
            placeholder="5"
            className={fieldCls(!!errors.experience)}
            aria-invalid={!!errors.experience}
            aria-describedby={errors.experience ? 'err-experience' : undefined}
            disabled={isSubmitting}
            data-testid="experience"
          />
          {errors.experience && (
            <p id="err-experience" className="mt-1 text-xs text-destructive">{errors.experience}</p>
          )}
        </div>

        {/* LinkedIn */}
        <div className="flex flex-col">
          <label htmlFor="linkedin" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.linkedin', 'LinkedIn Profile')}
          </label>
          <input
            id="linkedin"
            name="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            className={fieldCls(!!errors.linkedin)}
            aria-invalid={!!errors.linkedin}
            aria-describedby={errors.linkedin ? 'err-linkedin' : undefined}
            disabled={isSubmitting}
            data-testid="linkedin"
          />
          {errors.linkedin && (
            <p id="err-linkedin" className="mt-1 text-xs text-destructive">{errors.linkedin}</p>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-col md:col-span-2">
          <label htmlFor="skills" className="mb-1 text-sm font-semibold text-foreground">
            {t('careers.skills', 'Key Skills')}
          </label>
          <input
            id="skills"
            name="skills"
            type="text"
            placeholder={t('careers.skillsPh', 'React, TypeScript, Node.js, MongoDB')}
            className={fieldCls()}
            disabled={isSubmitting}
            data-testid="skills"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('careers.skillsHint', 'Separate skills with commas')}</p>
        </div>
      </div>

      {/* Cover Letter */}
      <div className="flex flex-col mt-4">
        <label htmlFor="coverLetter" className="mb-1 text-sm font-semibold text-foreground">
          {t('careers.coverLetter', 'Cover Letter')}
        </label>
        <textarea
          id="coverLetter"
          name="coverLetter"
          placeholder={t('careers.coverLetterPh', "Tell us why you're a great fit...")}
          className={`border p-2 rounded w-full focus:ring-2 focus:ring-primary focus:border-transparent border-border`}
          rows={5}
          disabled={isSubmitting}
          data-testid="coverLetter"
        />
      </div>

      {/* Resume Upload */}
      <div className="mt-4">
        <label htmlFor="resume" className="block text-sm font-semibold text-foreground mb-1">
          {t('careers.resume', 'CV / Résumé (PDF)')} <span className="text-destructive">*</span>
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          accept="application/pdf"
          required
          className="mt-1 block w-full text-sm text-muted-foreground
                     file:me-4 file:py-2 file:px-4
                     file:rounded file:border-0
                     file:text-sm file:font-semibold
                     file:bg-primary/5 file:text-primary
                     hover:file:bg-primary/10
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
          data-testid="resume"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('careers.resumeHint', 'PDF only · Max 5MB')}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {t('careers.resumeUploadNote', 'Uploaded resumes are virus-scanned.')}
          {resumeStatus && (
            <span className="font-semibold capitalize">
              {t('careers.resumeScanStatus', 'Scan status')}: {resumeStatus}
            </span>
          )}
        </p>
        {errors.resume && (
          <p className="mt-1 text-xs text-destructive">{errors.resume}</p>
        )}
      </div>

      {/* General error */}
      {errors.general && (
        <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded text-destructive text-sm" role="alert" aria-live="assertive" data-testid="general-error">
          {errors.general}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 px-6 py-3 bg-primary text-white rounded-2xl hover:bg-primary/90
                   transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        data-testid="submit-application"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ms-1 me-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('careers.submitting', 'Submitting application...')}
          </span>
        ) : (
          t('careers.submit', 'Submit Application')
        )}
      </button>

      <p className="text-xs text-muted-foreground mt-3">
        {t('careers.terms', 'By submitting this application, you agree to our privacy policy and terms of service.')}
      </p>
    </form>
  );
}

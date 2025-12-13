import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function main() {
  // Use Object.defineProperty to allow setting NODE_ENV in scripts
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'development',
    writable: true,
    configurable: true,
  });
  const { connectToDatabase } = await import('../lib/mongodb-unified');
  const { authConfig } = await import('../auth.config');
  const { User } = await import('../server/models/User');
  const bcrypt = await import('bcryptjs');
  const { logger } = await import('../lib/logger');
  const REQUIRE_SMS_OTP = process.env.NEXTAUTH_REQUIRE_SMS_OTP !== 'false';
  const LoginSchema = z
    .object({
      identifier: z.string().trim().min(1, 'Email or employee number is required'),
      password: z.string().min(1, 'Password is required'),
      otpToken: z.string().trim().min(1, 'OTP verification token is required').optional(),
      rememberMe: z.union([z.boolean(), z.string(), z.undefined()]).transform(val => {
        if (typeof val === 'boolean') return val;
        if (val === 'on' || val === 'true' || val === '1') return true;
        return false;
      }).optional().default(false),
    })
    .superRefine((data, ctx) => {
      if (REQUIRE_SMS_OTP && !data.otpToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['otpToken'],
          message: 'OTP verification is required. Please enter the latest code.',
        });
      }
    })
    .transform((data, ctx) => {
      const idRaw = data.identifier.trim();
      const emailOk = z.string().email().safeParse(idRaw).success;
      const empUpper = idRaw.toUpperCase();
      const empOk = /^EMP[-A-Z0-9]+$/.test(empUpper);

      let loginIdentifier = '';
      let loginType: 'personal' | 'corporate';

      if (emailOk) {
        loginIdentifier = idRaw.toLowerCase();
        loginType = 'personal';
      } else if (empOk) {
        loginIdentifier = empUpper;
        loginType = 'corporate';
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['identifier'],
          message: 'Enter a valid email address or employee number (e.g., EMP001)',
        });
        return z.NEVER;
      }

      return {
        loginIdentifier,
        loginType,
        password: data.password,
        otpToken: data.otpToken || null,
        rememberMe: data.rememberMe,
      };
    });

  console.log('env NEXTAUTH_REQUIRE_SMS_OTP:', process.env.NEXTAUTH_REQUIRE_SMS_OTP);
  logger.error('logger test error output');
  await connectToDatabase();
  const user = await User.findOne({ email: `test-admin@${EMAIL_DOMAIN}` }).lean();
  console.log('user record:', {
    exists: Boolean(user),
    status: user?.status,
    username: user?.username,
    passwordPrefix: typeof user?.password === 'string' ? user.password.slice(0, 7) : null,
  });
  if (user?.password) {
    console.log('password matches:', await bcrypt.compare('Test@1234', user.password));
  }
  if (user?._id) {
    try {
      const updateResult = await User.updateOne({ _id: user._id }, { $set: { 'security.lastLogin': new Date() } });
      console.log('lastLogin update result:', updateResult);
    } catch (err) {
      console.error('lastLogin update error:', err);
    }
  }
  const parsed = LoginSchema.safeParse({ identifier: `test-admin@${EMAIL_DOMAIN}`, password: 'Test@1234', rememberMe: 'on' });
  console.log('schema valid:', parsed.success, parsed.success ? parsed.data : parsed.error.flatten());

type CredentialsProviderLike = {
  id?: string;
  authorize?: (
    credentials: Record<string, unknown>,
    req: unknown,
  ) => Promise<unknown>;
  options?: {
    authorize?: (
      credentials: Record<string, unknown>,
      req: unknown,
    ) => Promise<unknown>;
  };
};

  const providers = Array.isArray(authConfig.providers)
    ? (authConfig.providers as CredentialsProviderLike[])
    : [];
  const cred = providers.find((p) => p.id === 'credentials');

  console.log('cred provider keys:', cred ? Object.keys(cred) : null);
  if (cred?.authorize) {
    console.log('authorize snippet:', cred.authorize.toString().slice(0, 200));
  }
  if (cred?.options?.authorize) {
    console.log('options authorize snippet:', cred.options.authorize.toString().slice(0, 200));
  }
  const emptyRequest: Record<string, unknown> = {};
  const res = cred?.authorize
    ? await cred.authorize(
        { identifier: `test-admin@${EMAIL_DOMAIN}`, password: 'Test@1234', rememberMe: 'on' },
        emptyRequest,
      )
    : null;
  console.log('authorize result:', res);
  const resOptions = cred?.options?.authorize
    ? await cred.options.authorize(
        { identifier: `test-admin@${EMAIL_DOMAIN}`, password: 'Test@1234', rememberMe: 'on' },
        emptyRequest,
      )
    : null;
  console.log('options authorize result:', resOptions);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

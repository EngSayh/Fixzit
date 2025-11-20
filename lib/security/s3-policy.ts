import { S3Client, GetBucketEncryptionCommand, GetBucketLifecycleConfigurationCommand, GetBucketPolicyStatusCommand } from '@aws-sdk/client-s3';

/**
 * Minimal S3 bucket policy/retention validation.
 * Returns true if encryption and lifecycle calls succeed; false otherwise.
 * Non-fatal: callers can decide whether to block on failure.
 */
export async function validateBucketPolicies(): Promise<boolean> {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    if (!bucket || !region) return false;

    const client = new S3Client({ region });

    // Encryption check
    await client.send(new GetBucketEncryptionCommand({ Bucket: bucket }));

    // Lifecycle (retention) check
    await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));

    // Policy status (public access)
    const policyStatus = await client.send(new GetBucketPolicyStatusCommand({ Bucket: bucket }));
    if (policyStatus.PolicyStatus?.IsPublic) return false;

    return true;
  } catch {
    return false;
  }
}

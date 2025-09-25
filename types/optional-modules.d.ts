// Minimal type stubs for optional runtime-only dependencies
// These allow Next.js type checking to pass when the modules are not installed.

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config?: any)
    send(command: any): Promise<any>
  }
  export class PutObjectCommand {
    constructor(params?: any)
  }
}

declare module 'cloudinary' {
  export const v2: any
}


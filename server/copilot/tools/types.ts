export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
  intent: string;
}

export interface UploadPayload {
  workOrderId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

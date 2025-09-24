export type RoleScope =
  | 'ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE' | 'TECHNICIAN' | 'PROPERTY_MANAGER' | 'TENANT' | 'VENDOR' | 'GUEST';

export interface KnowledgeArticle {
  _id?: string;
  orgId: string;
  lang: 'ar' | 'en';
  roleScopes: RoleScope[];
  module: string;       // e.g., "Work Orders"
  route?: string;       // e.g., "/work-orders/:id"
  title: string;
  slug: string;
  contentMDX: string;   // MDX or plain markdown
  tags: string[];
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED';
  version: number;
  sources: Array<{ type: 'db' | 'code' | 'admin' | 'verification'; ref: string }>;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface KbEmbedding {
  _id?: string;
  articleId: string;
  chunkId: string;
  lang: 'ar' | 'en';
  orgId: string;
  roleScopes: RoleScope[];
  route?: string;
  text: string;
  embedding: number[];      // Vector
  dims: number;             // 1536 or 3072
  provider: 'openai';
  updatedAt?: string;
}

export interface KbSearchResult {
  articleId: string;
  chunkId: string;
  text: string;
  route?: string;
  roleScopes: RoleScope[];
  score: number;
}

export interface KbAnswer {
  answer: string;
  sources: Array<{
    articleId: string;
    score: number;
  }>;
}
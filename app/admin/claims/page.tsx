'use client';

import ClaimReviewPanel from '@/components/admin/claims/ClaimReviewPanel';
import { Shield } from 'lucide-react';

export default function AdminClaimsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Shield className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">
            إدارة المطالبات
          </h1>
          <p className="text-muted-foreground">
            Claims Management & Review System
          </p>
        </div>
      </div>

      {/* Review Panel */}
      <ClaimReviewPanel />
    </div>
  );
}

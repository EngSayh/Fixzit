'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Video,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evidence {
  url: string;
  type: 'photo' | 'video' | 'document';
  uploadedBy: 'buyer' | 'seller' | 'admin';
  uploadedAt: string;
}

interface SellerResponse {
  solutionType: 'full-refund' | 'partial-refund' | 'replacement' | 'dispute';
  message: string;
  partialRefundAmount?: number;
  respondedAt: string;
}

interface Decision {
  outcome: 'approve-full' | 'approve-partial' | 'reject';
  reason: string;
  refundAmount?: number;
  decidedBy: string;
  decidedAt: string;
  recommendedAction?: string;
}

interface Appeal {
  reason: string;
  additionalEvidence?: string[];
  status: 'pending' | 'approved' | 'rejected';
  filedAt: string;
  appellant: 'buyer' | 'seller';
}

interface ClaimDetailsData {
  claimId: string;
  claimNumber: string;
  orderId: string;
  claimType: string;
  status: string;
  description: string;
  claimAmount: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  evidence: Evidence[];
  sellerResponse?: SellerResponse;
  decision?: Decision;
  appeal?: Appeal;
  createdAt: string;
  updatedAt: string;
  timeline: Array<{
    event: string;
    description: string;
    timestamp: string;
    actor?: string;
  }>;
}

interface ClaimDetailsProps {
  claimId: string;
  userRole: 'buyer' | 'seller' | 'admin';
  onActionRequired?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any }> = {
  filed: { label: 'تم التقديم (Filed)', variant: 'default', icon: FileText },
  'seller-notified': { label: 'تم إشعار البائع (Seller Notified)', variant: 'secondary', icon: MessageSquare },
  'under-investigation': { label: 'قيد التحقيق (Under Investigation)', variant: 'secondary', icon: Clock },
  'pending-seller-response': { label: 'بانتظار رد البائع (Awaiting Seller)', variant: 'secondary', icon: Clock },
  'seller-responded': { label: 'رد البائع (Seller Responded)', variant: 'default', icon: MessageSquare },
  'pending-decision': { label: 'بانتظار القرار (Pending Decision)', variant: 'secondary', icon: Clock },
  approved: { label: 'تمت الموافقة (Approved)', variant: 'default', icon: CheckCircle2 },
  'partially-approved': { label: 'موافقة جزئية (Partially Approved)', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'مرفوض (Rejected)', variant: 'destructive', icon: XCircle },
  'under-appeal': { label: 'قيد الاستئناف (Under Appeal)', variant: 'secondary', icon: AlertCircle },
  closed: { label: 'مغلق (Closed)', variant: 'outline', icon: CheckCircle2 },
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  'item-not-received': 'لم أستلم السلعة (Item Not Received)',
  'defective': 'السلعة معيبة (Defective Item)',
  'not-as-described': 'لا تطابق الوصف (Not as Described)',
  'wrong-item': 'سلعة خاطئة (Wrong Item Sent)',
  'missing-parts': 'أجزاء ناقصة (Missing Parts)',
  'counterfeit': 'سلعة مزيفة (Counterfeit Item)',
};

export default function ClaimDetails({ claimId, userRole, onActionRequired }: ClaimDetailsProps) {
  const [claim, setClaim] = useState<ClaimDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Evidence | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch claim details
  useState(() => {
    fetchClaimDetails();
  });

  const fetchClaimDetails = async () => {
    try {
      const response = await fetch(`/api/souq/claims/${claimId}`);
      if (response.ok) {
        const data = await response.json();
        setClaim(data);
      }
    } catch (error) {
      console.error('Failed to fetch claim:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">جاري التحميل... (Loading...)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!claim) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm">المطالبة غير موجودة (Claim not found)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[claim.status] || STATUS_CONFIG.filed;
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                مطالبة رقم {claim.claimNumber}
              </CardTitle>
              <CardDescription>
                Claim #{claim.claimNumber} • Order #{claim.orderId}
              </CardDescription>
            </div>
            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="evidence">الأدلة ({claim.evidence.length})</TabsTrigger>
              <TabsTrigger value="timeline">الجدول الزمني</TabsTrigger>
              <TabsTrigger value="communication">التواصل</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Claim Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">تفاصيل المطالبة (Claim Details)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">نوع المشكلة (Type)</p>
                    <p className="text-sm font-medium">{CLAIM_TYPE_LABELS[claim.claimType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المبلغ (Amount)</p>
                    <p className="text-sm font-medium">{claim.claimAmount} SAR</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ التقديم (Filed Date)</p>
                    <p className="text-sm font-medium">
                      {new Date(claim.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">آخر تحديث (Last Updated)</p>
                    <p className="text-sm font-medium">
                      {new Date(claim.updatedAt).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">وصف المشكلة (Problem Description)</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {claim.description}
                  </p>
                </div>

                <Separator />

                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">المشتري (Buyer)</h4>
                    <p className="text-sm">{claim.buyerName}</p>
                    <p className="text-xs text-muted-foreground">{claim.buyerId}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">البائع (Seller)</h4>
                    <p className="text-sm">{claim.sellerName}</p>
                    <p className="text-xs text-muted-foreground">{claim.sellerId}</p>
                  </div>
                </div>
              </div>

              {/* Seller Response */}
              {claim.sellerResponse && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold">رد البائع (Seller Response)</h3>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {claim.sellerResponse.solutionType === 'full-refund' && 'استرجاع كامل (Full Refund)'}
                          {claim.sellerResponse.solutionType === 'partial-refund' && 'استرجاع جزئي (Partial Refund)'}
                          {claim.sellerResponse.solutionType === 'replacement' && 'استبدال (Replacement)'}
                          {claim.sellerResponse.solutionType === 'dispute' && 'اعتراض (Dispute)'}
                        </span>
                        {claim.sellerResponse.partialRefundAmount && (
                          <Badge>{claim.sellerResponse.partialRefundAmount} SAR</Badge>
                        )}
                      </div>
                      <p className="text-sm">{claim.sellerResponse.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(claim.sellerResponse.respondedAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Decision */}
              {claim.decision && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold">القرار (Decision)</h3>
                    <div className={cn(
                      'p-4 rounded-lg space-y-2',
                      claim.decision.outcome === 'approve-full' && 'bg-green-50 border border-green-200',
                      claim.decision.outcome === 'approve-partial' && 'bg-blue-50 border border-blue-200',
                      claim.decision.outcome === 'reject' && 'bg-red-50 border border-red-200'
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {claim.decision.outcome === 'approve-full' && 'موافقة كاملة (Approved - Full Refund)'}
                          {claim.decision.outcome === 'approve-partial' && 'موافقة جزئية (Approved - Partial Refund)'}
                          {claim.decision.outcome === 'reject' && 'مرفوض (Rejected)'}
                        </span>
                        {claim.decision.refundAmount && (
                          <Badge>{claim.decision.refundAmount} SAR</Badge>
                        )}
                      </div>
                      <p className="text-sm">{claim.decision.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Decided by {claim.decision.decidedBy} • {new Date(claim.decision.decidedAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Appeal */}
              {claim.appeal && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold">الاستئناف (Appeal)</h3>
                    <div className="bg-warning/5 border border-yellow-200 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          استئناف من {claim.appeal.appellant === 'buyer' ? 'المشتري' : 'البائع'}
                        </span>
                        <Badge variant="secondary">{claim.appeal.status}</Badge>
                      </div>
                      <p className="text-sm">{claim.appeal.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(claim.appeal.filedAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Evidence Tab */}
            <TabsContent value="evidence" className="mt-6">
              {claim.evidence.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد أدلة (No evidence uploaded)</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {claim.evidence.map((evidence, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedMedia(evidence)}
                      className="relative group aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                    >
                      {evidence.type === 'photo' ? (
                        <img
                          src={evidence.url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          {evidence.type === 'video' ? (
                            <Video className="w-12 h-12 text-muted-foreground" />
                          ) : (
                            <FileText className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                        <p>
                          {evidence.uploadedBy === 'buyer' && 'المشتري'}
                          {evidence.uploadedBy === 'seller' && 'البائع'}
                          {evidence.uploadedBy === 'admin' && 'الإدارة'}
                        </p>
                        <p className="text-xs opacity-75">
                          {new Date(evidence.uploadedAt).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-6">
              <div className="space-y-4">
                {claim.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      {index < claim.timeline.length - 1 && (
                        <div className="w-px h-full bg-border my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">{event.event}</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString('ar-SA')}
                        </p>
                        {event.actor && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">{event.actor}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Communication Tab */}
            <TabsContent value="communication" className="mt-6">
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  نظام المراسلات قيد التطوير
                  <br />
                  Communication system coming soon
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {onActionRequired && (
            <div className="mt-6 flex justify-end gap-2">
              {userRole === 'seller' && claim.status === 'pending-seller-response' && (
                <Button onClick={onActionRequired}>
                  تقديم رد (Submit Response)
                </Button>
              )}
              {userRole === 'buyer' && claim.decision && !claim.appeal && (
                <Button onClick={onActionRequired} variant="outline">
                  تقديم استئناف (File Appeal)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Viewer Dialog */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>عرض الدليل (View Evidence)</DialogTitle>
              <DialogDescription>
                رفعه {selectedMedia.uploadedBy} في {new Date(selectedMedia.uploadedAt).toLocaleDateString('ar-SA')}
              </DialogDescription>
            </DialogHeader>
            <div className="w-full">
              {selectedMedia.type === 'photo' && (
                <img
                  src={selectedMedia.url}
                  alt="Evidence"
                  className="w-full h-auto rounded-lg"
                />
              )}
              {selectedMedia.type === 'video' && (
                <video src={selectedMedia.url} controls className="w-full rounded-lg" />
              )}
              {selectedMedia.type === 'document' && (
                <iframe src={selectedMedia.url} className="w-full h-96 rounded-lg" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

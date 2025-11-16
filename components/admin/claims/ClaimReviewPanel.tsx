'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Image as ImageIcon,
  Search,
  Shield,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ClaimForReview {
  claimId: string;
  claimNumber: string;
  orderId: string;
  claimType: string;
  status: string;
  claimAmount: number;
  buyerName: string;
  sellerName: string;
  fraudScore: number;
  recommendedAction: 'approve-full' | 'approve-partial' | 'reject';
  confidence: number;
  evidenceCount: number;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
}

interface DecisionData {
  outcome: 'approve-full' | 'approve-partial' | 'reject';
  reason: string;
  refundAmount?: number;
  recommendedAction?: string;
}

export default function ClaimReviewPanel() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<ClaimForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimForReview | null>(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [decisionData, setDecisionData] = useState<DecisionData>({
    outcome: 'approve-full',
    reason: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending-decision');
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClaimsForReview();
  }, [priorityFilter, statusFilter, searchQuery]);

  const fetchClaimsForReview = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
      });
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/souq/claims/admin/review?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setClaims(data.claims);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeDecision = (claim: ClaimForReview) => {
    setSelectedClaim(claim);
    setDecisionData({
      outcome: claim.recommendedAction,
      reason: '',
      refundAmount: claim.recommendedAction === 'approve-full' ? claim.claimAmount : undefined,
    });
    setShowDecisionDialog(true);
  };

  const submitDecision = async () => {
    if (!selectedClaim) return;

    if (decisionData.reason.trim().length < 20) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء تقديم سبب تفصيلي (20 حرف على الأقل)',
      });
      return;
    }

    if (decisionData.outcome === 'approve-partial') {
      if (!decisionData.refundAmount || decisionData.refundAmount <= 0 || decisionData.refundAmount > selectedClaim.claimAmount) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'الرجاء إدخال مبلغ استرجاع صحيح',
        });
        return;
      }
    }

    try {
      const response = await fetch(`/api/souq/claims/${selectedClaim.claimId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل إرسال القرار');
      }

      toast({
        title: 'تم إرسال القرار بنجاح',
        description: `تم اتخاذ القرار للمطالبة #${selectedClaim.claimNumber}`,
      });

      setShowDecisionDialog(false);
      fetchClaimsForReview();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: errorMessage,
      });
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedClaims.size === 0) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء اختيار مطالبات أولاً',
      });
      return;
    }

    // Bulk action implementation
    toast({
      title: 'جاري المعالجة',
      description: `تطبيق الإجراء على ${selectedClaims.size} مطالبة...`,
    });

    // TODO: Implement bulk action API call
    setSelectedClaims(new Set());
  };

  const toggleClaimSelection = (claimId: string) => {
    const newSelection = new Set(selectedClaims);
    if (newSelection.has(claimId)) {
      newSelection.delete(claimId);
    } else {
      newSelection.add(claimId);
    }
    setSelectedClaims(newSelection);
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      high: { label: 'عالي', variant: 'destructive' as const },
      medium: { label: 'متوسط', variant: 'default' as const },
      low: { label: 'منخفض', variant: 'secondary' as const },
    };
    const item = config[priority as keyof typeof config] || config.medium;
    return <Badge variant={item.variant}>{item.label}</Badge>;
  };

  const getFraudScoreBadge = (score: number) => {
    if (score >= 70) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        عالي: {score}
      </Badge>;
    } else if (score >= 40) {
      return <Badge variant="default" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        متوسط: {score}
      </Badge>;
    }
    return <Badge variant="secondary" className="flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      منخفض: {score}
    </Badge>;
  };

  const getRecommendationBadge = (action: string, confidence: number) => {
    const labels = {
      'approve-full': 'موافقة كاملة',
      'approve-partial': 'موافقة جزئية',
      'reject': 'رفض',
    };
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {labels[action as keyof typeof labels] || action}
        </Badge>
        <span className="text-xs text-muted-foreground">
          ({confidence}% ثقة)
        </span>
      </div>
    );
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                لوحة مراجعة المطالبات
              </CardTitle>
              <CardDescription>
                Admin Claims Review Panel - مراجعة واتخاذ القرارات
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('approve')}
                disabled={selectedClaims.size === 0}
              >
                موافقة جماعية ({selectedClaims.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('reject')}
                disabled={selectedClaims.size === 0}
              >
                رفض جماعي ({selectedClaims.size})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">بانتظار المراجعة</p>
                    <p className="text-2xl font-bold">
                      {claims.filter(c => c.status === 'pending-decision').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">عالية الأولوية</p>
                    <p className="text-2xl font-bold text-destructive">
                      {claims.filter(c => c.priority === 'high').length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">احتيال محتمل</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {claims.filter(c => c.fraudScore >= 70).length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                    <p className="text-2xl font-bold">
                      {claims.reduce((sum, c) => sum + c.claimAmount, 0).toLocaleString()} SAR
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم المطالبة أو الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="الحالة" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending-decision">بانتظار القرار</SelectItem>
                <SelectItem value="under-investigation">قيد التحقيق</SelectItem>
                <SelectItem value="under-appeal">قيد الاستئناف</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="الأولوية" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Claims Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Clock className="w-8 h-8 animate-spin" />
            </div>
          ) : claims.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm">لا توجد مطالبات للمراجعة</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedClaims.size === claims.length && claims.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClaims(new Set(claims.map(c => c.claimId)));
                          } else {
                            setSelectedClaims(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>رقم المطالبة</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>المشتري / البائع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>مؤشر الاحتيال</TableHead>
                    <TableHead>التوصية</TableHead>
                    <TableHead>الأدلة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.claimId} className={cn(
                      selectedClaims.has(claim.claimId) && 'bg-muted/50'
                    )}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedClaims.has(claim.claimId)}
                          onChange={() => toggleClaimSelection(claim.claimId)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <p>{claim.claimNumber}</p>
                          <p className="text-xs text-muted-foreground">Order #{claim.orderId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(claim.priority)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{claim.buyerName}</p>
                          <p className="text-muted-foreground">vs {claim.sellerName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {claim.claimAmount} SAR
                      </TableCell>
                      <TableCell>{getFraudScoreBadge(claim.fraudScore)}</TableCell>
                      <TableCell>
                        {getRecommendationBadge(claim.recommendedAction, claim.confidence)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{claim.evidenceCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(claim.createdAt).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleMakeDecision(claim)}
                        >
                          اتخاذ قرار
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              اتخاذ قرار - المطالبة #{selectedClaim?.claimNumber}
            </DialogTitle>
            <DialogDescription>
              Make Decision for Claim
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4">
              {/* Claim Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">المبلغ:</p>
                    <p className="font-medium">{selectedClaim.claimAmount} SAR</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">مؤشر الاحتيال:</p>
                    {getFraudScoreBadge(selectedClaim.fraudScore)}
                  </div>
                  <div>
                    <p className="text-muted-foreground">التوصية:</p>
                    {getRecommendationBadge(selectedClaim.recommendedAction, selectedClaim.confidence)}
                  </div>
                  <div>
                    <p className="text-muted-foreground">الأدلة:</p>
                    <p className="font-medium">{selectedClaim.evidenceCount} ملف</p>
                  </div>
                </div>
              </div>

              {/* Decision Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>القرار (Decision) *</Label>
                  <Select
                    value={decisionData.outcome}
                    onValueChange={(value: any) => setDecisionData({ ...decisionData, outcome: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve-full">موافقة كاملة (Full Refund)</SelectItem>
                      <SelectItem value="approve-partial">موافقة جزئية (Partial Refund)</SelectItem>
                      <SelectItem value="reject">رفض (Reject Claim)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {decisionData.outcome === 'approve-partial' && (
                  <div className="space-y-2">
                    <Label>مبلغ الاسترجاع (Refund Amount) *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={selectedClaim.claimAmount}
                        value={decisionData.refundAmount || ''}
                        onChange={(e) => setDecisionData({
                          ...decisionData,
                          refundAmount: parseFloat(e.target.value)
                        })}
                        placeholder="0.00"
                      />
                      <span className="text-sm">SAR</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      الحد الأقصى: {selectedClaim.claimAmount} SAR
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>سبب القرار (Decision Reason) *</Label>
                  <Textarea
                    placeholder="اشرح سبب القرار بالتفصيل..."
                    value={decisionData.reason}
                    onChange={(e) => setDecisionData({ ...decisionData, reason: e.target.value })}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {decisionData.reason.length}/500 - الحد الأدنى 20 حرف
                  </p>
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    <p className="font-medium mb-1">تنبيه:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>القرار سيتم إرساله فوراً للطرفين</li>
                      <li>في حالة الموافقة، سيتم معالجة الاسترجاع تلقائياً</li>
                      <li>الطرفان لديهما 7 أيام للاستئناف</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={submitDecision}>
              تأكيد القرار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResponseFormProps {
  claimId: string;
  claimDetails: {
    claimNumber: string;
    claimType: string;
    claimAmount: number;
    description: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

type SolutionType = 'full-refund' | 'partial-refund' | 'replacement' | 'dispute';

export default function ResponseForm({ claimId, claimDetails, onSuccess, onCancel }: ResponseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solutionType, setSolutionType] = useState<SolutionType>('dispute');
  const [message, setMessage] = useState('');
  const [partialRefundAmount, setPartialRefundAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (message.trim().length < 20) {
      setError('الرجاء تقديم رد تفصيلي (20 حرف على الأقل) - Please provide detailed response (minimum 20 characters)');
      return;
    }

    if (solutionType === 'partial-refund') {
      const amount = parseFloat(partialRefundAmount);
      if (isNaN(amount) || amount <= 0 || amount > claimDetails.claimAmount) {
        setError(`المبلغ يجب أن يكون بين 0 و ${claimDetails.claimAmount} SAR (Amount must be between 0 and ${claimDetails.claimAmount} SAR)`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/souq/claims/${claimId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionType,
          message,
          partialRefundAmount: solutionType === 'partial-refund' ? parseFloat(partialRefundAmount) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل إرسال الرد (Failed to submit response)');
      }

      toast({
        title: 'تم إرسال الرد بنجاح',
        description: 'تم تسجيل ردك وسيتم مراجعته',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'خطأ (Error)',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>الرد على المطالبة #{claimDetails.claimNumber}</CardTitle>
        <CardDescription>
          Respond to Claim - نموذج رد البائع
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Claim Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">ملخص المطالبة (Claim Summary)</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">النوع:</span> {claimDetails.claimType}</p>
              <p><span className="font-medium">المبلغ:</span> {claimDetails.claimAmount} SAR</p>
              <p className="text-muted-foreground italic">{claimDetails.description}</p>
            </div>
          </div>

          {/* Solution Type */}
          <div className="space-y-3">
            <Label>نوع الحل المقترح (Proposed Solution) *</Label>
            <RadioGroup value={solutionType} onValueChange={(value: string) => setSolutionType(value as SolutionType)}>
              <div className="space-y-3">
                {/* Full Refund */}
                <div className="flex items-start space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="full-refund" id="full-refund" className="mt-1" />
                  <Label htmlFor="full-refund" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="font-medium">استرجاع كامل (Full Refund)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      الموافقة على إرجاع المبلغ بالكامل ({claimDetails.claimAmount} SAR) للمشتري
                      <br />
                      Agree to refund the full amount to the buyer
                    </p>
                  </Label>
                </div>

                {/* Partial Refund */}
                <div className="flex items-start space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="partial-refund" id="partial-refund" className="mt-1" />
                  <Label htmlFor="partial-refund" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">استرجاع جزئي (Partial Refund)</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      عرض استرجاع جزء من المبلغ
                      <br />
                      Offer to refund a partial amount
                    </p>
                    {solutionType === 'partial-refund' && (
                      <div className="mt-2">
                        <Label htmlFor="partialAmount" className="text-xs">
                          المبلغ المقترح (Proposed Amount) *
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id="partialAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            max={claimDetails.claimAmount}
                            value={partialRefundAmount}
                            onChange={(e) => setPartialRefundAmount(e.target.value)}
                            placeholder="0.00"
                            className="max-w-[150px]"
                          />
                          <span className="text-sm">SAR</span>
                          <span className="text-xs text-muted-foreground">
                            (الحد الأقصى: {claimDetails.claimAmount})
                          </span>
                        </div>
                      </div>
                    )}
                  </Label>
                </div>

                {/* Replacement */}
                <div className="flex items-start space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="replacement" id="replacement" className="mt-1" />
                  <Label htmlFor="replacement" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-secondary-foreground" />
                      <span className="font-medium">استبدال (Replacement)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      عرض إرسال منتج بديل للمشتري
                      <br />
                      Offer to send a replacement product to the buyer
                    </p>
                  </Label>
                </div>

                {/* Dispute */}
                <div className="flex items-start space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="dispute" id="dispute" className="mt-1" />
                  <Label htmlFor="dispute" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">اعتراض (Dispute Claim)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      الاعتراض على المطالبة وتقديم دليل مضاد
                      <br />
                      Dispute the claim and provide counter-evidence
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Response Message */}
          <div className="space-y-2">
            <Label htmlFor="message">ردك التفصيلي (Detailed Response) *</Label>
            <Textarea
              id="message"
              placeholder="اشرح موقفك بالتفصيل... (Explain your position in detail...)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 - الحد الأدنى 20 حرف (Minimum 20 characters)
            </p>
          </div>

          {/* Guidelines */}
          <Alert>
            <AlertDescription className="text-sm space-y-2">
              <p className="font-medium">إرشادات الرد (Response Guidelines):</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>كن محترماً ومهنياً في ردك (Be respectful and professional)</li>
                <li>قدم أدلة داعمة إن وجدت (رقم التتبع، صور، إيصالات) - Provide supporting evidence if available</li>
                <li>اشرح الموقف بوضوح من وجهة نظرك (Clearly explain your perspective)</li>
                <li>الردود السريعة تساعد في حل المشكلة بشكل أسرع (Quick responses help resolve issues faster)</li>
                <li>سيتم مراجعة ردك من قبل فريق الدعم (Your response will be reviewed by support team)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            إلغاء (Cancel)
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال الرد (Submit Response)'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

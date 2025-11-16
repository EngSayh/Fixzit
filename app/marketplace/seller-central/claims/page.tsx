'use client';

import { useState } from 'react';
import ClaimList from '@/components/souq/claims/ClaimList';
import ClaimDetails from '@/components/souq/claims/ClaimDetails';
import ResponseForm from '@/components/souq/claims/ResponseForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

type ViewMode = 'list' | 'details' | 'respond';

export default function SellerClaimsPage() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [claimForResponse, setClaimForResponse] = useState<any>(null);

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaimId(claimId);
    setViewMode('details');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedClaimId(null);
  };

  const handleRespondToClaim = () => {
    // Fetch claim details and show response form
    setShowResponseDialog(true);
    // In a real app, fetch claim details here
    setClaimForResponse({
      claimId: selectedClaimId,
      claimNumber: 'CLM-12345',
      claimType: 'item-not-received',
      claimAmount: 250,
      description: 'Customer claims item was not received',
    });
  };

  const handleResponseSuccess = () => {
    setShowResponseDialog(false);
    setViewMode('list');
    // Refresh the claims list
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {viewMode !== 'list' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {t('marketplace.claims.seller.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('marketplace.claims.seller.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-semibold">{t('marketplace.claims.seller.importantNotice')}</span> {t('marketplace.claims.seller.responseDeadline')}
        </AlertDescription>
      </Alert>

      {/* Content */}
      {viewMode === 'list' && (
        <ClaimList
          view="seller"
          onSelectClaim={handleSelectClaim}
        />
      )}

      {viewMode === 'details' && selectedClaimId && (
        <ClaimDetails
          claimId={selectedClaimId}
          userRole="seller"
          onActionRequired={handleRespondToClaim}
        />
      )}

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('marketplace.claims.seller.respondToClaim')}</DialogTitle>
            <DialogDescription>
              {t('marketplace.claims.seller.respondToClaimSubtitle')}
            </DialogDescription>
          </DialogHeader>
          {claimForResponse && (
            <ResponseForm
              claimId={claimForResponse.claimId}
              claimDetails={claimForResponse}
              onSuccess={handleResponseSuccess}
              onCancel={() => setShowResponseDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

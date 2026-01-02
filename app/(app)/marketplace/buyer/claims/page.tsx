"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ClaimList from "@/components/souq/claims/ClaimList";
import ClaimDetails from "@/components/souq/claims/ClaimDetails";
import ClaimForm from "@/components/souq/claims/ClaimForm";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/IconButton";
import { ArrowLeft, FileText } from "@/components/ui/icons";
import { useI18n } from "@/i18n/useI18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ViewMode = "list" | "details" | "new";

export default function BuyerClaimsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showNewClaimDialog, setShowNewClaimDialog] = useState(false);
  const [selectedOrder] = useState<{
    orderId: string;
    itemName: string;
    orderAmount: number;
    orderDate: string;
    sellerId: string;
    sellerName: string;
    productId: string;
  } | null>(null);

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaimId(claimId);
    setViewMode("details");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedClaimId(null);
  };

  const handleNewClaim = () => {
    // In a real app, this would allow user to select an order first
    // For now, we'll show a placeholder
    setShowNewClaimDialog(true);
  };

  const handleClaimSuccess = () => {
    setShowNewClaimDialog(false);
    setViewMode("list");
    // Refresh the claims list
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {viewMode !== "list" && (
            <IconButton
              icon={<ArrowLeft className="w-5 h-5" />}
              tooltip={t("common.back") || "Back"}
              variant="ghost"
              onClick={handleBackToList}
              aria-label={t("common.back") || "Back"}
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {t("marketplace.claims.buyer.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("marketplace.claims.buyer.subtitle")}
            </p>
          </div>
        </div>
        {viewMode === "list" && (
          <Button
            onClick={handleNewClaim}
            aria-label={t("marketplace.claims.buyer.newClaim") || "تقديم مطالبة جديدة"}
            title={t("marketplace.claims.buyer.newClaim") || "File a new claim"}
          >
            <FileText className="w-4 h-4 me-2" />
            {t("marketplace.claims.buyer.newClaim") || "تقديم مطالبة جديدة"}
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === "list" && (
        <ClaimList view="buyer" onSelectClaim={handleSelectClaim} />
      )}

      {viewMode === "details" && selectedClaimId && (
        <ClaimDetails claimId={selectedClaimId} userRole="buyer" />
      )}

      {/* New Claim Dialog */}
      <Dialog open={showNewClaimDialog} onOpenChange={setShowNewClaimDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تقديم مطالبة جديدة</DialogTitle>
            <DialogDescription>
              File a new A-to-Z Guarantee Claim
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              الرجاء تحديد الطلب الذي ترغب في تقديم مطالبة بشأنه
              <br />
              Please select the order you want to file a claim for
            </p>
            <Button
              onClick={() => router.push("/marketplace/orders")}
              aria-label="View my orders"
              title="View my orders"
            >
              عرض طلباتي (View My Orders)
            </Button>
          </div>
          {/* In a real implementation, this would show order selection UI */}
          {selectedOrder && (
            <ClaimForm
              orderId={selectedOrder.orderId}
              orderDetails={selectedOrder}
              onSuccess={handleClaimSuccess}
              onCancel={() => setShowNewClaimDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

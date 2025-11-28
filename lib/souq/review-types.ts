// Client-safe review types (no mongoose imports)

export type SellerReview = {
  reviewId: string;
  productId?: string;
  fsin?: string;
  customerName: string;
  isVerifiedPurchase: boolean;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  images?: Array<{
    url: string;
    caption?: string;
    uploadedAt: Date;
  }>;
  helpful: number;
  notHelpful: number;
  sellerResponse?: {
    content: string;
    respondedAt: Date;
    respondedBy: string;
  };
  status: "pending" | "published" | "rejected" | "flagged";
  moderationNotes?: string;
  reportedCount?: number;
  reportReasons?: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
};

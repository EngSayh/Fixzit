/**
 * Review Submission Page - Submit review for purchased product
 * @route /marketplace/orders/[orderId]/review
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReviewForm, type ReviewFormData } from '@/components/seller/reviews/ReviewForm';

export default function OrderReviewPage({
  params,
}: {
  params: { orderId: string };
}) {
  const router = useRouter();
  const [_submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // In real implementation, fetch order details to get product info
  const productName = 'Product Name'; // Placeholder
  const productId = 'PROD-123'; // Placeholder

  const handleSubmit = async (data: ReviewFormData) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/souq/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          orderId: params.orderId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit review');
      }

      // Success - redirect to orders page
      router.push('/marketplace/orders?review_submitted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border rounded-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <ReviewForm
            productId={productId}
            productName={productName}
            orderId={params.orderId}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </div>
  );
}

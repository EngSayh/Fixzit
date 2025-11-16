/**
 * SellerResponseForm Component - Seller response to reviews
 */
'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface SellerResponseFormProps {
  reviewId: string;
  reviewTitle: string;
  onSubmit?: (_reviewId: string, _content: string) => Promise<void>;
  onCancel?: () => void;
}

async function postSellerResponse(reviewId: string, content: string): Promise<void> {
  const response = await fetch(`/api/souq/seller-central/reviews/${reviewId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    let message = 'Failed to submit response';
    try {
      const data = await response.json();
      if (typeof data?.error === 'string') {
        message = data.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
}

export function SellerResponseForm({
  reviewId,
  reviewTitle,
  onSubmit,
  onCancel,
}: SellerResponseFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (content.length < 10) {
      setError('Response must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(reviewId, content);
      } else {
        await postSellerResponse(reviewId, content);
      }
      setContent('');
      setSuccess('Response submitted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Respond to Review</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        Responding to: &quot;{reviewTitle}&quot;
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Thank the customer and address their feedback..."
        maxLength={1000}
        rows={4}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
      />
      <p className="text-xs text-muted-foreground mt-1">
        {content.length}/1000 characters (minimum 10)
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mt-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mt-3">
          {success}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border rounded-lg hover:bg-white disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || content.length < 10}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Post Response'}
        </button>
      </div>
    </form>
  );
}

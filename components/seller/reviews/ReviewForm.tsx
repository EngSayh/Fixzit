/**
 * ReviewForm Component - Submit/edit product reviews
 */
'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

export interface ReviewFormData {
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  images?: Array<{ url: string; caption?: string }>;
}

interface ReviewFormProps {
  productId: string;
  productName: string;
  orderId?: string;
  initialData?: Partial<ReviewFormData>;
  onSubmit: (_data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
}

export function ReviewForm({
  productId: _productId,
  productName,
  orderId,
  initialData,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [pros, setPros] = useState<string[]>(initialData?.pros || ['']);
  const [cons, setCons] = useState<string[]>(initialData?.cons || ['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }

    if (content.length < 20) {
      setError('Review must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        rating,
        title,
        content,
        pros: pros.filter((p) => p.trim() !== ''),
        cons: cons.filter((c) => c.trim() !== ''),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPro = () => setPros([...pros, '']);
  const addCon = () => setCons([...cons, '']);

  const updatePro = (index: number, value: string) => {
    const newPros = [...pros];
    newPros[index] = value;
    setPros(newPros);
  };

  const updateCon = (index: number, value: string) => {
    const newCons = [...cons];
    newCons[index] = value;
    setCons(newCons);
  };

  const removePro = (index: number) => {
    setPros(pros.filter((_, i) => i !== index));
  };

  const removeCon = (index: number) => {
    setCons(cons.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Info */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Review {productName}</h2>
        {orderId && (
          <p className="text-sm text-muted-foreground mt-1">
            Verified Purchase - Order #{orderId}
          </p>
        )}
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground self-center">
              {rating} out of 5 stars
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Review Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={200}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {title.length}/200 characters
        </p>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-2">
          Detailed Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this product..."
          maxLength={5000}
          rows={6}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {content.length}/5000 characters (minimum 20)
        </p>
      </div>

      {/* Pros */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Pros (Optional)
        </label>
        {pros.map((pro, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={pro}
              onChange={(e) => updatePro(index, e.target.value)}
              placeholder="What did you like?"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => removePro(index)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addPro}
          className="text-sm text-primary hover:underline"
        >
          + Add Pro
        </button>
      </div>

      {/* Cons */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Cons (Optional)
        </label>
        {cons.map((con, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={con}
              onChange={(e) => updateCon(index, e.target.value)}
              placeholder="What could be improved?"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => removeCon(index)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addCon}
          className="text-sm text-primary hover:underline"
        >
          + Add Con
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}

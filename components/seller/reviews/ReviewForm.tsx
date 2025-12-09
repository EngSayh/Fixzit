"use client";

/**
 * ReviewForm Component - Submit/edit product reviews
 */

import React, { useState } from "react";
import { Star } from "lucide-react";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

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
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [pros, setPros] = useState<string[]>(initialData?.pros || [""]);
  const [cons, setCons] = useState<string[]>(initialData?.cons || [""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const auto = useAutoTranslator("seller.reviewForm");
  const defaultSubmitError = auto(
    "Failed to submit review",
    "errors.submitFailed",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (rating === 0) {
      setError(auto("Please select a rating", "validation.ratingRequired"));
      return;
    }

    if (title.length < 5) {
      setError(
        auto("Title must be at least 5 characters", "validation.titleLength"),
      );
      return;
    }

    if (content.length < 20) {
      setError(
        auto(
          "Review must be at least 20 characters",
          "validation.contentLength",
        ),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        rating,
        title,
        content,
        pros: pros.filter((p) => p.trim() !== ""),
        cons: cons.filter((c) => c.trim() !== ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : defaultSubmitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPro = () => setPros([...pros, ""]);
  const addCon = () => setCons([...cons, ""]);

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
        <h2 className="text-2xl font-bold">
          {auto("Review {{productName}}", "header.title").replace(
            "{{productName}}",
            productName,
          )}
        </h2>
        {orderId && (
          <p className="text-sm text-muted-foreground mt-1">
            {auto(
              "Verified Purchase - Order #{{orderId}}",
              "header.verifiedOrder",
            ).replace("{{orderId}}", orderId)}
          </p>
        )}
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {auto("Rating", "rating.label")}{" "}
          <span className="text-destructive">*</span>
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
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ms-2 text-sm text-muted-foreground self-center">
              {auto("{{rating}} out of 5 stars", "rating.caption").replace(
                "{{rating}}",
                String(rating),
              )}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          {auto("Review Title", "fields.title.label")}{" "}
          <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={auto(
            "Summarize your experience",
            "fields.title.placeholder",
          )}
          maxLength={200}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {auto("{{count}}/200 characters", "fields.title.counter").replace(
            "{{count}}",
            String(title.length),
          )}
        </p>
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium mb-2">
          {auto("Detailed Review", "fields.content.label")}{" "}
          <span className="text-destructive">*</span>
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={auto(
            "Share your experience with this product...",
            "fields.content.placeholder",
          )}
          maxLength={5000}
          rows={6}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {auto(
            "{{count}}/5000 characters (minimum 20)",
            "fields.content.counter",
          ).replace("{{count}}", String(content.length))}
        </p>
      </div>

      {/* Pros */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {auto("Pros (Optional)", "fields.pros.label")}
        </label>
        {pros.map((pro, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={pro}
              onChange={(e) => updatePro(index, e.target.value)}
              placeholder={auto(
                "What did you like?",
                "fields.pros.placeholder",
              )}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => removePro(index)}
              className="px-3 py-2 text-destructive hover:bg-destructive/5 rounded-lg"
            >
              {auto("Remove", "actions.remove")}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addPro}
          className="text-sm text-primary hover:underline"
        >
          {auto("+ Add Pro", "actions.addPro")}
        </button>
      </div>

      {/* Cons */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {auto("Cons (Optional)", "fields.cons.label")}
        </label>
        {cons.map((con, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={con}
              onChange={(e) => updateCon(index, e.target.value)}
              placeholder={auto(
                "What could be improved?",
                "fields.cons.placeholder",
              )}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => removeCon(index)}
              className="px-3 py-2 text-destructive hover:bg-destructive/5 rounded-lg"
            >
              {auto("Remove", "actions.remove")}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addCon}
          className="text-sm text-primary hover:underline"
        >
          {auto("+ Add Con", "actions.addCon")}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/5 border border-red-200 text-destructive-dark px-4 py-3 rounded-lg">
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
            {auto("Cancel", "actions.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting
            ? auto("Submitting...", "actions.submitting")
            : auto("Submit Review", "actions.submit")}
        </button>
      </div>
    </form>
  );
}

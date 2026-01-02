"use client";

/**
 * SellerResponseForm Component - Seller response to reviews
 */

import React, { useState } from "react";
import { MessageSquare } from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface SellerResponseFormProps {
  reviewId: string;
  reviewTitle: string;
  onSubmit?: (_reviewId: string, _content: string) => Promise<void>;
  onCancel?: () => void;
}

async function postSellerResponse(
  reviewId: string,
  content: string,
  defaultErrorMessage: string,
): Promise<void> {
  const response = await fetch(
    `/api/souq/seller-central/reviews/${reviewId}/respond`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );

  if (!response.ok) {
    let message = defaultErrorMessage;
    try {
      const data = await response.json();
      if (typeof data?.error === "string") {
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
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const auto = useAutoTranslator("seller.reviewResponse");
  const minLengthError = auto(
    "Response must be at least 10 characters",
    "validation.minLength",
  );
  const defaultSubmitError = auto(
    "Failed to submit response",
    "errors.submitFailed",
  );
  const successMessage = auto(
    "Response submitted successfully",
    "success.submitted",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (content.length < 10) {
      setError(minLengthError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(reviewId, content);
      } else {
        await postSellerResponse(reviewId, content, defaultSubmitError);
      }
      setContent("");
      setSuccess(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : defaultSubmitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">
          {auto("Respond to Review", "header.title")}
        </h3>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {auto('Responding to: "{{title}}"', "header.subtitle").replace(
          "{{title}}",
          reviewTitle,
        )}
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={auto(
          "Thank the customer and address their feedback...",
          "fields.content.placeholder",
        )}
        maxLength={1000}
        rows={4}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
      />
      <p className="text-xs text-muted-foreground mt-1">
        {auto(
          "{{count}}/1000 characters (minimum 10)",
          "fields.content.counter",
        ).replace("{{count}}", String(content.length))}
      </p>

      {error && (
        <div className="bg-destructive/5 border border-red-200 text-destructive-dark px-3 py-2 rounded-lg text-sm mt-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/5 border border-green-200 text-success-dark px-3 py-2 rounded-lg text-sm mt-3">
          {success}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label={auto("Cancel", "actions.cancel")}
            className="px-4 py-2 border rounded-lg hover:bg-white disabled:opacity-50"
          >
            {auto("Cancel", "actions.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || content.length < 10}
          aria-label={isSubmitting ? auto("Submitting...", "actions.submitting") : auto("Post Response", "actions.submit")}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting
            ? auto("Submitting...", "actions.submitting")
            : auto("Post Response", "actions.submit")}
        </button>
      </div>
    </form>
  );
}

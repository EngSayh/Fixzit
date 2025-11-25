"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { FormWithNavigation } from "@/components/ui/navigation-buttons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { logger } from "@/lib/logger";

/**
 * Renders a support ticket submission form and handles creating tickets via the app API.
 *
 * The component displays fields for subject, module, type, priority, description, and contact information.
 * On submit it sends a POST to /api/support/tickets with a payload containing subject, module, type, priority,
 * a hard-coded category/subCategory ("General"/"Other"), the description as `text`, and a `requester` object
 * with name, email, and optional phone. While the request is in progress the submit button is disabled.
 * On success the form is reset and a success alert is shown; on failure an error alert is shown.
 *
 * @returns The support ticket page as a React element.
 */
export default function SupportTicketPage() {
  const auto = useAutoTranslator("help.supportTicket");
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    subject: "",
    module: "FM",
    type: "Bug",
    priority: "Medium",
    description: "",
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Pre-fill user data from session when available
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email,
      }));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitEl = (e.currentTarget as HTMLFormElement)?.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    if (submitEl) {
      submitEl.disabled = true;
    }
    setIsSubmitting(true);
    try {
      setToast(null);
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.subject,
          module: formData.module,
          type: formData.type,
          priority: formData.priority,
          category: "General",
          subCategory: "Other",
          text: formData.description,
          requester: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
          },
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const apiMsg =
          (payload && (payload.error || payload.message)) ||
          `Request failed (${res.status})`;
        throw new Error(apiMsg);
      }
      const successMessage = auto(
        "Support Ticket Created Successfully! Our team will respond within 24 hours.",
        "toast.success",
      );
      setToast({
        type: "success",
        message: successMessage,
      });
      if (typeof alert === "function") {
        alert(successMessage);
      }
      setFormData({
        subject: "",
        module: "FM",
        type: "Bug",
        priority: "Medium",
        description: "",
        name: "",
        email: "",
        phone: "",
      });
    } catch (err) {
      const errorMessage = auto(
        "There was an error submitting your ticket. Please try again.",
        "toast.error",
      );
      setToast({ type: "error", message: errorMessage });
      if (typeof alert === "function") {
        alert(errorMessage);
      }
      logger.error("[SupportTicket] Submission error", err);
    } finally {
      // Defer reset so UI stays in "submitting" state briefly (helps UX and tests)
      setTimeout(() => setIsSubmitting(false), 50);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="max-w-2xl mx-auto p-4 flex-1 flex flex-col">
        {toast && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm ${toast.type === "success" ? "bg-success/10 text-success-foreground border border-success/20" : "bg-destructive/10 text-destructive-foreground border border-destructive/20"}`}
          >
            {toast.message}
          </div>
        )}
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {auto("Create Support Ticket", "header.title")}
            </h1>
            <p className="text-muted-foreground">
              {auto(
                "Fill out the form below and our support team will get back to you within 24 hours.",
                "header.subtitle",
              )}
            </p>
          </div>

          <FormWithNavigation
            onSubmit={handleSubmit}
            saving={isSubmitting}
            showBack
            showHome
            showSave={false}
            position="both"
          >
            {/* Subject */}
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {auto("Subject *", "form.subject.label")}
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={auto(
                  "Brief description of your issue",
                  "form.subject.placeholder",
                )}
                required
              />
            </div>

            {/* Module and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="module"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {auto("Module", "form.module.label")}
                </label>
                <select
                  id="module"
                  name="module"
                  value={formData.module}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card"
                >
                  <option value="FM">
                    {auto("Facility Management", "form.module.options.fm")}
                  </option>
                  <option value="Souq">
                    {auto("Marketplace", "form.module.options.souq")}
                  </option>
                  <option value="Aqar">
                    {auto("Real Estate", "form.module.options.aqar")}
                  </option>
                  <option value="Account">
                    {auto("Account", "form.module.options.account")}
                  </option>
                  <option value="Billing">
                    {auto("Billing", "form.module.options.billing")}
                  </option>
                  <option value="Other">
                    {auto("Other", "form.module.options.other")}
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {auto("Type", "form.type.label")}
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card"
                >
                  <option value="Bug">
                    {auto("Bug Report", "form.type.options.bug")}
                  </option>
                  <option value="Feature">
                    {auto("Feature Request", "form.type.options.feature")}
                  </option>
                  <option value="Complaint">
                    {auto("Complaint", "form.type.options.complaint")}
                  </option>
                  <option value="Billing">
                    {auto("Billing Issue", "form.type.options.billing")}
                  </option>
                  <option value="Access">
                    {auto("Access Issue", "form.type.options.access")}
                  </option>
                  <option value="Other">
                    {auto("Other", "form.type.options.other")}
                  </option>
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {auto("Priority", "form.priority.label")}
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card"
              >
                <option value="Low">
                  {auto("Low", "form.priority.options.low")}
                </option>
                <option value="Medium">
                  {auto("Medium", "form.priority.options.medium")}
                </option>
                <option value="High">
                  {auto("High", "form.priority.options.high")}
                </option>
                <option value="Urgent">
                  {auto("Urgent", "form.priority.options.urgent")}
                </option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {auto("Description *", "form.description.label")}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                placeholder={auto(
                  "Please provide detailed information about your issue or request...",
                  "form.description.placeholder",
                )}
                required
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-2xl">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {auto("Your Name *", "form.name.label")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={auto(
                    "Enter your full name",
                    "form.name.placeholder",
                  )}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {auto("Email *", "form.email.label")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={auto(
                    "your.email@example.com",
                    "form.email.placeholder",
                  )}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-2xl">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {auto("Phone (optional)", "form.phone.label")}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={auto(
                    "+966 XX XXX XXXX",
                    "form.phone.placeholder",
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => setIsSubmitting(true)}
              >
                {isSubmitting && (
                  <Loader2 className="inline me-2 h-4 w-4 animate-spin align-middle" />
                )}
                {isSubmitting
                  ? auto("Submitting...", "actions.submitting")
                  : auto("Submit Ticket", "actions.submit")}
              </button>
            </div>
          </FormWithNavigation>
        </div>
      </div>
    </div>
  );
}

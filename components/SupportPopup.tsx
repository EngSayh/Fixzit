"use client";
import React, { useState, useEffect } from "react";

const api = async (url: string, opts?: RequestInit) => {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const res = await fetch(url, { ...opts, headers: { ...headers, ...opts?.headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

interface ErrorDetails {
  error?: { name?: string; message?: string; stack?: string; componentStack?: string };
  errorId?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  type?: string;
  system?: {
    platform?: string;
    language?: string;
    onLine?: boolean;
    memory?: {
      used?: number;
      total?: number;
      limit?: number;
    } | null;
  };
  localStorage?: {
    hasAuth?: boolean;
    hasUser?: boolean;
    hasLang?: boolean;
    hasTheme?: boolean;
  };
}


export default function SupportPopup({ onClose, errorDetails }: { onClose: ()=>void, errorDetails?: ErrorDetails }){
  const [subject,setSubject]=useState(errorDetails ? `Error Report: ${errorDetails.type}` : "");
  const [moduleKey,setModule]=useState("Other");
  const [type,setType]=useState("Bug");
  const [priority,setPriority]=useState("Medium");
  const [text,setText]=useState("");
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [category,setCategory]=useState("Technical");
  const [subCategory,setSubCategory]=useState("Bug Report");

  // Auto-populate fields if error details are provided
  useEffect(() => {
    if (errorDetails) {
      setSubject(`System Error: ${errorDetails.error?.name || 'Unknown'} - ${errorDetails.error?.message?.substring(0, 50) || ''}...`);
      setModule("Other");
      setType("Bug");
      setPriority("High");
      setText(generateErrorDescription(errorDetails));
    }
  }, [errorDetails]);

  const generateErrorDescription = (errorDetails: ErrorDetails) => {
    return `🚨 **Automated Error Report**

**Error ID:** \`${errorDetails.errorId}\`
**Timestamp:** ${errorDetails.timestamp}
**URL:** ${errorDetails.url}
**User Agent:** ${errorDetails.userAgent}

**Error Details:**
- **Type:** ${errorDetails.error?.name || 'Unknown'}
- **Message:** ${errorDetails.error?.message || 'No message available'}
- **Viewport:** ${errorDetails.viewport}
- **Platform:** ${errorDetails.system?.platform || 'Unknown'}

**System Information:**
- **Language:** ${errorDetails.system?.language || 'Unknown'}
- **Online Status:** ${errorDetails.system?.onLine ? 'Online' : 'Offline'}
${errorDetails.system?.memory ? `- **Memory Usage:** ${Math.round(errorDetails.system.memory.used ?? 0 / 1024 / 1024)}MB used` : ''}

**Application State:**
- **Authenticated:** ${errorDetails.localStorage?.hasAuth ? '✅' : '❌'}
- **User Data:** ${errorDetails.localStorage?.hasUser ? '✅' : '❌'}
- **Language Set:** ${errorDetails.localStorage?.hasLang ? '✅' : '❌'}
- **Theme Set:** ${errorDetails.localStorage?.hasTheme ? '✅' : '❌'}

**Stack Trace:**
\`\`\`
${errorDetails.error?.stack || 'No stack trace available'}
\`\`\`

**Component Stack:**
\`\`\`
${errorDetails.error?.componentStack || 'No component stack available'}
\`\`\`

---

*This ticket was automatically created from an error boundary. Please investigate and resolve the issue.*`;
  };

  const submit = async()=>{
    const payload: Record<string, unknown> = {
      subject,
      module: moduleKey,
      type,
      priority,
      text,
      category,
      subCategory
    };

    // if not logged in, include requester
    try {
      const hdr = localStorage.getItem("x-user");
      if (!hdr) payload.requester = { name, email, phone };

      // Show loading state
      const submitBtn = document.querySelector('[data-testid="submit-btn"]') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating Ticket...";
      }

      const res = await api("/api/support/tickets", { method:"POST", body: JSON.stringify(payload) });

      // Success message with better formatting
      const successMessage = `🎯 Support Ticket Created Successfully!

Ticket ID: ${res.code}
Subject: ${subject}
Priority: ${priority}
Module: ${moduleKey}
Type: ${type}
Category: ${category}
Sub-Category: ${subCategory}

You will receive updates via email. Our support team will respond within 24 hours.

Thank you for contacting Fixzit Support!

${!hdr && email ? `

📧 Welcome Email Sent!
We've sent a welcome email to ${email} with registration instructions and next steps.` : ''}`;

      alert(successMessage);
      onClose();
    } catch(e: unknown) {
      console.error("Ticket creation error:", e);
      const errorMessage = e instanceof Error ? e.message : "Please try again or contact support directly.";
      alert(`❌ Failed to create ticket: ${errorMessage}`);

      // Reset button state
      const submitBtn = document.querySelector('[data-testid="submit-btn"]') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Ticket";
      }
    }
  };

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(text || subject);
      alert("Details copied to clipboard");
    } catch {
      // no-op
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto min-h-screen">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 relative mx-auto my-4 md:my-8">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none hover:bg-gray-100 rounded-lg p-2 transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="pr-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Support Ticket</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Fill out the form below and our support team will get back to you within 24 hours.
          </p>
        </div>
        {/* Form */}
        <div className="space-y-4">
          {/* Subject and Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject *
              </label>
              <input
                id="subject"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={e=>setSubject(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Module
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                value={moduleKey}
                onChange={e=>setModule(e.target.value)}
              >
                {["FM","Souq","Aqar","Account","Billing","Other"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Category and Sub-Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                value={category}
                onChange={e=>setCategory(e.target.value)}
              >
                {["Technical","Feature Request","Billing","Account","General","Bug Report"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sub-Category
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                value={subCategory}
                onChange={e=>setSubCategory(e.target.value)}
              >
                {category === "Technical" && ["Bug Report","Performance Issue","UI Error","API Error","Database Error"].map(s=><option key={s}>{s}</option>)}
                {category === "Feature Request" && ["New Feature","Enhancement","Integration","Customization","Mobile App"].map(s=><option key={s}>{s}</option>)}
                {category === "Billing" && ["Invoice Issue","Payment Error","Subscription","Refund","Pricing"].map(s=><option key={s}>{s}</option>)}
                {category === "Account" && ["Login Issue","Password Reset","Profile Update","Permissions","Access Denied"].map(s=><option key={s}>{s}</option>)}
                {category === "General" && ["Documentation","Training","Support","Feedback","Other"].map(s=><option key={s}>{s}</option>)}
                {category === "Bug Report" && ["Critical Bug","Minor Bug","Cosmetic Issue","Data Error","Security Issue"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                value={type}
                onChange={e=>setType(e.target.value)}
              >
                {["Bug","Feature","Complaint","Billing","Access","Other"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                value={priority}
                onChange={e=>setPriority(e.target.value)}
              >
                {["Low","Medium","High","Urgent"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-32 resize-none"
              placeholder="Please provide detailed information about your issue or request..."
              value={text}
              onChange={e=>setText(e.target.value)}
              required
            />
          </div>

          {/* Guest-only fields */}
          {!localStorage.getItem("x-user") && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Name *
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e=>setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={e=>setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+966 XX XXX XXXX"
                  value={phone}
                  onChange={e=>setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <button
              className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg font-medium transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={copyDetails}
              disabled={!subject.trim() && !text.trim()}
            >
              Copy details
            </button>
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={submit}
              disabled={!subject.trim() || !text.trim()}
              data-testid="submit-btn"
            >
              Submit Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FormWithNavigation } from '@/components/ui/navigation-buttons';

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
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState({
    subject: '',
    module: 'FM',
    type: 'Bug',
    priority: 'Medium',
    description: '',
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pre-fill user data from session when available
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email
      }));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setToast(null);
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          module: formData.module,
          type: formData.type,
          priority: formData.priority,
          category: 'General',
          subCategory: 'Other',
          text: formData.description,
          requester: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined
          }
        })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const apiMsg = (payload && (payload.error || payload.message)) || `Request failed (${res.status})`;
        throw new Error(apiMsg);
      }
      setToast({ type: 'success', message: 'Support Ticket Created Successfully! Our team will respond within 24 hours.' });
      setFormData({
        subject: '',
        module: 'FM',
        type: 'Bug',
        priority: 'Medium',
        description: '',
        name: '',
        email: '',
        phone: ''
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'There was an error submitting your ticket. Please try again.';
      setToast({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="max-w-2xl mx-auto p-4 flex-1 flex flex-col">
        {toast && (
          <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${toast.type === 'success' ? 'bg-success/10 text-success-foreground border border-success/20' : 'bg-destructive/10 text-destructive-foreground border border-destructive/20'}`}>
            {toast.message}
          </div>
        )}
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Create Support Ticket</h1>
            <p className="text-muted-foreground">
              Fill out the form below and our support team will get back to you within 24 hours.
            </p>
          </div>

          <FormWithNavigation 
            onSubmit={handleSubmit} 
            saving={isSubmitting}
            showBack
            showHome
            position="both"
          >
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of your issue"
                required
              />
            </div>

            {/* Module and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Module
                </label>
                <select
                  name="module"
                  value={formData.module}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card"
                >
                  <option value="FM">Facility Management</option>
                  <option value="Souq">Marketplace</option>
                  <option value="Aqar">Real Estate</option>
                  <option value="Account">Account</option>
                  <option value="Billing">Billing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card"
                >
                  <option value="Bug">Bug Report</option>
                  <option value="Feature">Feature Request</option>
                  <option value="Complaint">Complaint</option>
                  <option value="Billing">Billing Issue</option>
                  <option value="Access">Access Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                placeholder="Please provide detailed information about your issue or request..."
                required
              />
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-2xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-2xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+966 XX XXX XXXX"
                />
              </div>
            </div>
          </FormWithNavigation>
        </div>
      </div>
    </div>
  );
}

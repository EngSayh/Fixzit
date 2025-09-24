'use client';
import React, { useState } from 'react';

export default function SupportTicketPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/support/tickets', {
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
      if (!response.ok) throw new Error('Failed to create ticket');
      alert(`🎯 Support Ticket Created Successfully!

Your ticket has been submitted and our support team will get back to you within 24 hours.`);
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
    } catch {
      alert('There was an error submitting your ticket. Please try again.');
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
    <div>
      <h1>Create Support Ticket</h1>
      <p>Fill out the form below and our support team will get back to you within 24 hours.</p>
      <form onSubmit={handleSubmit}>
        <label>Subject *<input aria-label="Subject *" name="subject" value={formData.subject} onChange={handleChange} required /></label>
        <label>Module
          <select aria-label="Module" name="module" value={formData.module} onChange={handleChange}>
            <option value="FM">Facility Management</option>
            <option value="Souq">Marketplace</option>
            <option value="Aqar">Real Estate</option>
            <option value="Account">Account</option>
            <option value="Billing">Billing</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>Type
          <select aria-label="Type" name="type" value={formData.type} onChange={handleChange}>
            <option value="Bug">Bug Report</option>
            <option value="Feature">Feature Request</option>
            <option value="Complaint">Complaint</option>
            <option value="Billing">Billing Issue</option>
            <option value="Access">Access Issue</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>Priority
          <select aria-label="Priority" name="priority" value={formData.priority} onChange={handleChange}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </label>
        <label>Description *<textarea aria-label="Description *" name="description" value={formData.description} onChange={handleChange} required /></label>
        <label>Your Name *<input aria-label="Your Name *" name="name" value={formData.name} onChange={handleChange} required /></label>
        <label>Email *<input aria-label="Email *" type="email" name="email" value={formData.email} onChange={handleChange} required /></label>
        <label>Phone (optional)<input aria-label="Phone (optional)" name="phone" value={formData.phone} onChange={handleChange} /></label>
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</button>
      </form>
    </div>
  );
}
'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function NewWorkOrderPage() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fixzit-text)]">New Work Order</h1>
          <p className="text-[var(--fixzit-text-secondary)]">Create a new work order for maintenance or services</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">{t('common.save', 'Save Draft')}</button>
          <button className="btn-primary">Create Work Order</button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Order Title *
                </label>
                <input
                  type="text"
                  placeholder="Enter work order title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option value="">Select Priority</option>
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Property & Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property *
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option value="">Select Property</option>
                  <option value="tower-a">Tower A</option>
                  <option value="tower-b">Tower B</option>
                  <option value="villa-9">Villa 9</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit/Location
                </label>
                <input
                  type="text"
                  placeholder="Unit number or specific location..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Description</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Description *
              </label>
              <textarea
                rows={4}
                placeholder="Describe the work that needs to be done..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Assignment & Scheduling</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent">
                  <option value="">Select Technician</option>
                  <option value="tech-1">Ahmed Al-Rashid</option>
                  <option value="tech-2">Mohammed Al-Saud</option>
                  <option value="tech-3">Omar Al-Fahad</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--fixzit-blue)] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Attachments</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-400 mb-2">📎</div>
              <p className="text-sm text-gray-600">Drop files here or click to upload</p>
              <button className="mt-2 text-sm text-[var(--fixzit-blue)] hover:underline">
                Choose Files
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full btn-ghost text-left">
                📋 Create from Template
              </button>
              <button className="w-full btn-ghost text-left">
                📞 Emergency Contact
              </button>
              <button className="w-full btn-ghost text-left">
                📊 Cost Calculator
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Form auto-saved</span>
                <span className="text-gray-400 ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Property selected</span>
                <span className="text-gray-400 ml-auto">5m ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


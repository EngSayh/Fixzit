'use client';

import React, { useState, useEffect } from 'react';
import { WorkOrderFormData, WorkOrderCategory, WorkOrderPriority, CATEGORY_CONFIG, PRIORITY_CONFIG } from '../../../types/work-orders';
import PhotoUpload from './PhotoUpload';

interface Property {
  id: string;
  name: string;
  address: string;
  units?: Array<{ id: string; unitNumber: string; type: string }>;
}

interface EnhancedCreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  properties?: Property[];
  templates?: Array<{
    id: string;
    name: string;
    category: WorkOrderCategory;
    description: string;
    estimatedHours: number;
    estimatedCost: number;
  }>;
}

const defaultTemplates = [
  {
    id: '1',
    name: 'AC Repair',
    category: 'hvac' as WorkOrderCategory,
    description: 'Air conditioning unit not working properly. Check refrigerant levels, filters, and electrical connections.',
    estimatedHours: 3,
    estimatedCost: 200
  },
  {
    id: '2',
    name: 'Plumbing Leak',
    category: 'plumbing' as WorkOrderCategory,
    description: 'Water leak detected. Locate source and repair damaged pipes or fixtures.',
    estimatedHours: 2,
    estimatedCost: 150
  },
  {
    id: '3',
    name: 'Electrical Issue',
    category: 'electrical' as WorkOrderCategory,
    description: 'Electrical problem reported. Check wiring, outlets, and circuit breakers.',
    estimatedHours: 2.5,
    estimatedCost: 175
  }
];

export default function EnhancedCreateWorkOrderModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  properties = [],
  templates = defaultTemplates
}: EnhancedCreateWorkOrderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WorkOrderFormData>({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    propertyId: '',
    unitId: '',
    dueDate: '',
    estimatedHours: undefined,
    estimatedCost: undefined,
    photos: []
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    if (formData.propertyId) {
      const property = properties.find(p => p.id === formData.propertyId);
      setSelectedProperty(property || null);
      setFormData(prev => ({ ...prev, unitId: '' })); // Reset unit selection
    }
  }, [formData.propertyId, properties]);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: template.name,
          description: template.description,
          category: template.category,
          estimatedHours: template.estimatedHours,
          estimatedCost: template.estimatedCost
        }));
      }
    }
  }, [selectedTemplate, templates]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      propertyId: '',
      unitId: '',
      dueDate: '',
      estimatedHours: undefined,
      estimatedCost: undefined,
      photos: []
    });
    setCurrentStep(1);
    setErrors({});
    setSelectedProperty(null);
    setSelectedTemplate('');
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        break;
      
      case 2:
        // Property and unit are optional, but if property is selected, we validate
        break;
      
      case 3:
        // Photos and additional details are optional
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating work order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotosChange = (photos: File[]) => {
    setFormData(prev => ({ ...prev, photos }));
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Work order details' },
    { number: 2, title: 'Location & Schedule', description: 'Property and timing' },
    { number: 3, title: 'Photos & Attachments', description: 'Visual documentation' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Work Order</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.number 
                        ? 'bg-[#0061A8] text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {currentStep > step.number ? '✓' : step.number}
                    </div>
                    <div className="ml-3">
                      <div className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-4 ${
                      currentStep > step.number ? 'bg-[#0061A8]' : 'bg-gray-200'
                    }`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Start Templates (Optional)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                  >
                    <option value="">Select a template or create from scratch</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {CATEGORY_CONFIG[template.category].icon} {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-[#0061A8] focus:border-[#0061A8] ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Brief description of the issue"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-[#0061A8] focus:border-[#0061A8] ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Detailed description of the work needed, symptoms, and any relevant information"
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as WorkOrderCategory }))}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-[#0061A8] focus:border-[#0061A8] ${
                        errors.category ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.icon} {config.label}
                        </option>
                      ))}
                    </select>
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as WorkOrderPriority }))}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-[#0061A8] focus:border-[#0061A8] ${
                        errors.priority ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                    {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location & Schedule */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Property */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property
                    </label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                    >
                      <option value="">Select a property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name} - {property.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      value={formData.unitId}
                      onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                      disabled={!selectedProperty?.units}
                    >
                      <option value="">Select a unit</option>
                      {selectedProperty?.units?.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unitNumber} ({unit.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Estimated Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.estimatedHours || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                      placeholder="0.0"
                    />
                  </div>

                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.estimatedCost || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Photos & Attachments */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Photos and Attachments</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload photos to help technicians understand the issue better. 
                    Include before photos, damage documentation, or reference images.
                  </p>
                  
                  <PhotoUpload
                    photos={formData.photos || []}
                    onPhotosChange={handlePhotosChange}
                    maxFiles={10}
                    maxFileSize={5}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-8">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Previous
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                
                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005098] transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005098] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Work Order'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
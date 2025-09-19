'use client';

import React, { useState } from 'react';
import { WorkOrderStatus, WorkOrderPriority, STATUS_CONFIG, PRIORITY_CONFIG } from '../../../types/work-orders';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  action: string;
  onConfirm: (data: any) => void;
  technicians?: { id: string; firstName: string; lastName: string }[];
}

export default function BulkActionsModal({ 
  isOpen, 
  onClose, 
  selectedCount, 
  action, 
  onConfirm,
  technicians = []
}: BulkActionsModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onConfirm(formData);
      onClose();
      setFormData({});
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    switch (action) {
      case 'assign':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Technician
            </label>
            <select
              value={formData.assignedTo || ''}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
              required
            >
              <option value="">Select a technician</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          </div>
        );

      case 'update_status':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
              required
            >
              <option value="">Select status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'update_priority':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Priority
            </label>
            <select
              value={formData.priority || ''}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
              required
            >
              <option value="">Select priority</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'add_comment':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <textarea
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
              placeholder="Add a comment to all selected work orders..."
              required
            />
          </div>
        );

      case 'delete':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center gap-3">
              <div className="text-red-600 text-xl">⚠️</div>
              <div>
                <h4 className="text-red-800 font-medium">Confirm Deletion</h4>
                <p className="text-red-700 text-sm mt-1">
                  This action cannot be undone. Are you sure you want to delete {selectedCount} work order{selectedCount !== 1 ? 's' : ''}?
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unknown action: {action}</div>;
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case 'assign':
        return 'Assign Technician';
      case 'update_status':
        return 'Update Status';
      case 'update_priority':
        return 'Update Priority';
      case 'add_comment':
        return 'Add Comment';
      case 'delete':
        return 'Delete Work Orders';
      default:
        return 'Bulk Action';
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'delete':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-[#0061A8] hover:bg-[#005098]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{getActionTitle()}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                This action will affect <span className="font-medium">{selectedCount}</span> work order{selectedCount !== 1 ? 's' : ''}.
              </p>
              
              {renderFormContent()}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getActionColor()}`}
              >
                {loading ? 'Processing...' : action === 'delete' ? 'Delete' : 'Apply Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
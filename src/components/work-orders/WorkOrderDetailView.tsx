'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WorkOrder, STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../../types/work-orders';
import WorkOrderTimelineComponent from './WorkOrderTimeline';
import WorkOrderComments from './WorkOrderComments';

interface WorkOrderDetailViewProps {
  workOrder: WorkOrder;
  onStatusChange: (status: string) => Promise<void>;
  onAssign: (technicianId: string) => Promise<void>;
  onAddComment: (comment: string, type: 'comment' | 'internal') => Promise<void>;
  onUpdateDetails: (updates: Partial<WorkOrder>) => Promise<void>;
  technicians?: Array<{ id: string; firstName: string; lastName: string; role: string }>;
  loading?: boolean;
}

export default function WorkOrderDetailView({
  workOrder,
  onStatusChange,
  onAssign,
  onAddComment,
  onUpdateDetails,
  technicians = [],
  loading = false
}: WorkOrderDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'photos' | 'files'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: workOrder.title,
    description: workOrder.description,
    priority: workOrder.priority,
    estimatedCost: workOrder.estimatedCost,
    estimatedHours: workOrder.estimatedHours
  });

  const statusConfig = STATUS_CONFIG[workOrder.status];
  const priorityConfig = PRIORITY_CONFIG[workOrder.priority];
  const categoryConfig = CATEGORY_CONFIG[workOrder.category];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isOverdue = workOrder.dueDate && 
    new Date(workOrder.dueDate) < new Date() && 
    !['completed', 'cancelled', 'closed'].includes(workOrder.status);

  const handleSaveEdit = async () => {
    try {
      await onUpdateDetails(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating work order:', error);
    }
  };

  const getNextStatusOptions = () => {
    const statusFlow = {
      'draft': ['open'],
      'open': ['assigned', 'in_progress', 'on_hold', 'cancelled'],
      'assigned': ['in_progress', 'on_hold', 'cancelled'],
      'in_progress': ['completed', 'on_hold', 'cancelled'],
      'on_hold': ['in_progress', 'cancelled'],
      'completed': ['closed'],
      'closed': [],
      'cancelled': ['open']
    };

    return statusFlow[workOrder.status] || [];
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'photos', label: 'Photos', icon: '📷' },
    { id: 'files', label: 'Files', icon: '📎' }
  ];

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading work order...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/work-orders"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <span className="text-lg">{categoryConfig.icon}</span>
              <h1 className="text-2xl font-bold text-gray-900">{workOrder.title}</h1>
              {isOverdue && <span className="text-red-500 text-lg">⚠️</span>}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">{workOrder.woNumber}</span>
              <span>•</span>
              <span>{workOrder.property?.name}</span>
              {workOrder.unit && (
                <>
                  <span>•</span>
                  <span>Unit {workOrder.unit.unitNumber}</span>
                </>
              )}
              <span>•</span>
              <span>Created {formatDate(workOrder.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            
            {isEditing && (
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005098] transition-colors"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Status and Priority */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{statusConfig.icon}</span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Priority:</span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${priorityConfig.bgColor} ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${categoryConfig.color}`}>
              {categoryConfig.icon} {categoryConfig.label}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {getNextStatusOptions().map((status) => {
            const nextStatusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
            return (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                  status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                  'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {nextStatusConfig.icon} {nextStatusConfig.label}
              </button>
            );
          })}

          {!workOrder.assignee && (
            <select
              onChange={(e) => e.target.value && onAssign(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              defaultValue=""
            >
              <option value="">Assign Technician</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-[#0061A8] text-[#0061A8]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                    {isEditing ? (
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8]"
                      />
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Work Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Estimated Hours:</span>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              value={editData.estimatedHours || ''}
                              onChange={(e) => setEditData(prev => ({ 
                                ...prev, 
                                estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className="text-sm font-medium">{workOrder.estimatedHours || 'TBD'} hours</span>
                          )}
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Estimated Cost:</span>
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editData.estimatedCost || ''}
                              onChange={(e) => setEditData(prev => ({ 
                                ...prev, 
                                estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {workOrder.estimatedCost ? formatCurrency(workOrder.estimatedCost) : 'TBD'}
                            </span>
                          )}
                        </div>

                        {workOrder.actualHours && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Actual Hours:</span>
                            <span className="text-sm font-medium">{workOrder.actualHours} hours</span>
                          </div>
                        )}

                        {workOrder.actualCost && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Actual Cost:</span>
                            <span className="text-sm font-medium">{formatCurrency(workOrder.actualCost)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Schedule</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Created:</span>
                          <span className="text-sm font-medium">{formatDate(workOrder.createdAt)}</span>
                        </div>

                        {workOrder.dueDate && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Due Date:</span>
                            <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                              {formatDate(workOrder.dueDate)}
                            </span>
                          </div>
                        )}

                        {workOrder.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Completed:</span>
                            <span className="text-sm font-medium">{formatDate(workOrder.completedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <WorkOrderTimelineComponent
                  timeline={workOrder.timeline}
                  comments={workOrder.comments}
                />
              )}

              {/* Photos Tab */}
              {activeTab === 'photos' && (
                <div>
                  {workOrder.photos && workOrder.photos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workOrder.photos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={photo.url}
                              alt={photo.description || `Work order photo`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {photo.type} Photo
                            </div>
                            {photo.description && (
                              <div className="text-sm text-gray-600">{photo.description}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              {formatDate(photo.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-6xl mb-4">📷</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                      <p className="text-gray-600">Photos will appear here when uploaded</p>
                    </div>
                  )}
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">📎</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No files attached</h3>
                  <p className="text-gray-600">Documents and files will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Comments & Updates</h3>
            </div>
            <div className="p-6">
              <WorkOrderComments
                workOrderId={workOrder.id}
                onAddComment={onAddComment}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Assignment Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment</h3>
            
            {workOrder.assignee ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {workOrder.assignee.firstName.charAt(0)}{workOrder.assignee.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {workOrder.assignee.firstName} {workOrder.assignee.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{workOrder.assignee.role || 'Technician'}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-400 text-3xl mb-2">👤</div>
                <p className="text-gray-600 mb-3">Not assigned</p>
                <select
                  onChange={(e) => e.target.value && onAssign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  defaultValue=""
                >
                  <option value="">Select Technician</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Property Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
            
            {workOrder.property && (
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900">{workOrder.property.name}</div>
                  <div className="text-sm text-gray-600">{workOrder.property.address}</div>
                </div>
                
                {workOrder.unit && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="font-medium text-gray-900">Unit {workOrder.unit.unitNumber}</div>
                    <div className="text-sm text-gray-600">Residential Unit</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Creator Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Created By</h3>
            
            {workOrder.creator && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {workOrder.creator.firstName.charAt(0)}{workOrder.creator.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {workOrder.creator.firstName} {workOrder.creator.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{workOrder.creator.role || 'Manager'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
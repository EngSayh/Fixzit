'use client';

import React, { useState } from 'react';

interface WorkOrderCommentsProps {
  workOrderId: string;
  onAddComment: (comment: string, type: 'comment' | 'internal') => Promise<void>;
  className?: string;
}

export default function WorkOrderComments({ 
  workOrderId, 
  onAddComment,
  className = ''
}: WorkOrderCommentsProps) {
  const [comment, setComment] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'internal'>('comment');
  const [loading, setLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    setLoading(true);
    try {
      await onAddComment(comment.trim(), commentType);
      setComment('');
      setCommentType('comment');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const insertSlashCommand = (command: string) => {
    setComment(prev => {
      const cursorPosition = (document.activeElement as HTMLTextAreaElement)?.selectionStart || prev.length;
      return prev.slice(0, cursorPosition) + command + ' ' + prev.slice(cursorPosition);
    });
    setShowCommands(false);
  };

  const quickCommands = [
    { command: '/assign', description: 'Assign to technician' },
    { command: '/priority', description: 'Change priority' },
    { command: '/status', description: 'Update status' },
    { command: '/estimate', description: 'Add time/cost estimate' },
    { command: '/schedule', description: 'Schedule work' },
    { command: '/parts', description: 'Request parts' },
    { command: '/close', description: 'Close work order' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setComment(value);
    
    // Show commands when user types '/'
    const lastWord = value.split(' ').pop() || '';
    setShowCommands(lastWord.startsWith('/') && lastWord.length > 1);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Comment Type Toggle */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Comment type:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setCommentType('comment')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  commentType === 'comment' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Public Comment
              </button>
              <button
                type="button"
                onClick={() => setCommentType('internal')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  commentType === 'internal' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Internal Note
              </button>
            </div>
          </div>

          {/* Comment Input */}
          <div className="relative">
            <textarea
              value={comment}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#0061A8] focus:border-[#0061A8] resize-none"
              placeholder={
                commentType === 'internal' 
                  ? "Add an internal note (not visible to customers)..." 
                  : "Add a comment or use slash commands (/assign, /status, etc.)..."
              }
            />
            
            {/* Slash Commands Dropdown */}
            {showCommands && (
              <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {quickCommands
                  .filter(cmd => cmd.command.includes(comment.split(' ').pop()?.toLowerCase() || ''))
                  .map((cmd) => (
                    <button
                      key={cmd.command}
                      type="button"
                      onClick={() => insertSlashCommand(cmd.command)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      <span className="font-mono text-blue-600">{cmd.command}</span>
                      <span className="text-sm text-gray-600">{cmd.description}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Quick actions:</span>
            {quickCommands.slice(0, 4).map((cmd) => (
              <button
                key={cmd.command}
                type="button"
                onClick={() => insertSlashCommand(cmd.command)}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
              >
                {cmd.command}
              </button>
            ))}
          </div>

          {/* Comment Type Info */}
          {commentType === 'internal' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-orange-600">🔒</span>
                <span className="text-sm text-orange-800 font-medium">Internal Note</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                This note will only be visible to internal team members and technicians.
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Tip:</span> Use slash commands for quick actions
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                {comment.length}/1000
              </div>
              <button
                type="submit"
                disabled={loading || !comment.trim() || comment.length > 1000}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#005098] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : commentType === 'internal' ? 'Add Note' : 'Add Comment'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Command Help */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Available Slash Commands</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {quickCommands.map((cmd) => (
            <div key={cmd.command} className="flex items-center gap-2">
              <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {cmd.command}
              </span>
              <span className="text-gray-600">{cmd.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
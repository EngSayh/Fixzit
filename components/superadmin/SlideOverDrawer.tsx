/**
 * Slide-Over Drawer Component
 * Right-side panel for viewing/editing record details
 */
"use client";

import React from 'react';
import { X } from '@/components/ui/icons';
import { IconButton } from '@/components/ui/IconButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SlideOverDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <IconButton
              icon={<X className="h-4 w-4" />}
              tooltip="Close"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close drawer"
            />
          </div>
        </DialogHeader>
        <div className="mt-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

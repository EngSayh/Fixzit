'use client';

import React, { useState, useRef, useCallback } from 'react';

interface PhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  accept?: string;
  className?: string;
}

export default function PhotoUpload({ 
  photos, 
  onPhotosChange, 
  maxFiles = 10,
  maxFileSize = 5,
  accept = 'image/*',
  className = ''
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxFileSize}MB.`;
    }
    
    if (!file.type.startsWith('image/')) {
      return `File "${file.name}" is not a valid image file.`;
    }
    
    return null;
  };

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles = Array.from(fileList);
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    // Check total file count
    if (photos.length + newFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
      setErrors(newErrors);
      return;
    }

    // Validate each file
    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else {
      setErrors([]);
      onPhotosChange([...photos, ...validFiles]);
    }
  }, [photos, onPhotosChange, maxFiles, maxFileSize]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    setErrors([]);
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const createPreviewUrl = (file: File) => {
    return URL.createObjectURL(file);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-[#0061A8] bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="text-gray-600">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          
          <p className="text-lg font-medium mb-2">
            {dragActive ? 'Drop photos here' : 'Upload Photos'}
          </p>
          
          <p className="text-sm text-gray-500 mb-4">
            Drag and drop photos here, or click to select files
          </p>
          
          <p className="text-xs text-gray-400">
            Maximum {maxFiles} files, {maxFileSize}MB each. Supported formats: JPG, PNG, GIF
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600 mr-3">⚠️</div>
            <div>
              <h4 className="text-red-800 font-medium">Upload Errors</h4>
              <ul className="text-red-700 text-sm mt-1 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Selected Photos ({photos.length}/{maxFiles})
            </h4>
            {photos.length > 0 && (
              <button
                onClick={() => onPhotosChange([])}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={createPreviewUrl(photo)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Overlay with remove button */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                    className="bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* File info */}
                <div className="mt-2 text-xs text-gray-600 truncate">
                  {photo.name}
                </div>
                <div className="text-xs text-gray-400">
                  {(photo.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress Indicator */}
      {photos.length > 0 && (
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#0061A8] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(photos.length / maxFiles) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs whitespace-nowrap">
              {photos.length}/{maxFiles}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
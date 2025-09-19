'use client';
import { useState, useRef } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import { GlassCard, GlassButton, GlassInput } from '../theme';
import api from '../../lib/api';

type Props = {
  onCreated: () => void;
  onClose?: () => void;
  prefilledPropertyId?: string;
};

type WorkOrderData = {
  title: string;
  description: string;
  propertyId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  unitId?: string;
};

export default function WoCreateWithPhotos({ onCreated, onClose, prefilledPropertyId }: Props) {
  const { isRTL } = useTranslation();
  const [formData, setFormData] = useState<WorkOrderData>({
    title: '',
    description: '',
    propertyId: prefilledPropertyId || '',
    priority: 'MEDIUM',
    category: 'MAINTENANCE'
  });
  
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof WorkOrderData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (type: 'before' | 'after', files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      return isImage && isValidSize;
    });

    if (type === 'before') {
      setBeforePhotos(prev => [...prev, ...validFiles]);
    } else {
      setAfterPhotos(prev => [...prev, ...validFiles]);
    }
  };

  const removePhoto = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      setBeforePhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  async function uploadAttachment(woId: string, file: File, role: 'BEFORE' | 'AFTER') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', `${role} photo - ${file.name}`);
    
    // Backend: POST /work-orders/:id/attachments?role=BEFORE|AFTER
    await api.post(`/work-orders/${woId}/attachments`, formData, { 
      params: { role },
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  }

  const submit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setErr(isRTL ? 'العنوان والوصف مطلوبان' : 'Title and description are required');
      return;
    }

    if (!formData.propertyId) {
      setErr(isRTL ? 'يرجى تحديد العقار' : 'Please select a property');
      return;
    }

    setErr('');
    setSubmitting(true);
    setUploadProgress(0);

    try {
      // 1) Create Work Order
      const { data: wo } = await api.post('/work-orders', formData);
      setUploadProgress(20);

      // 2) Upload BEFORE photos if provided
      if (beforePhotos.length > 0) {
        for (let i = 0; i < beforePhotos.length; i++) {
          await uploadAttachment(wo.id, beforePhotos[i], 'BEFORE');
          setUploadProgress(20 + (30 * (i + 1) / beforePhotos.length));
        }
      }

      // 3) Upload AFTER photos if provided
      if (afterPhotos.length > 0) {
        for (let i = 0; i < afterPhotos.length; i++) {
          await uploadAttachment(wo.id, afterPhotos[i], 'AFTER');
          setUploadProgress(50 + (40 * (i + 1) / afterPhotos.length));
        }
      }

      setUploadProgress(90);

      // 4) Optionally: auto-request approval based on logic or priority
      if (formData.priority === 'HIGH' || formData.priority === 'URGENT') {
        await api.post(`/work-orders/${wo.id}/request-approval`);
      }

      setUploadProgress(100);

      // Reset form
      setFormData({
        title: '',
        description: '',
        propertyId: prefilledPropertyId || '',
        priority: 'MEDIUM',
        category: 'MAINTENANCE'
      });
      setBeforePhotos([]);
      setAfterPhotos([]);
      setUploadProgress(null);

      onCreated();
      onClose?.();

    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Create failed');
      setUploadProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  const priorities = [
    { value: 'LOW', label: isRTL ? 'منخفض' : 'Low', color: 'text-slate-600' },
    { value: 'MEDIUM', label: isRTL ? 'متوسط' : 'Medium', color: 'text-blue-600' },
    { value: 'HIGH', label: isRTL ? 'عالي' : 'High', color: 'text-orange-600' },
    { value: 'URGENT', label: isRTL ? 'طارئ' : 'Urgent', color: 'text-rose-600' }
  ];

  const categories = [
    { value: 'MAINTENANCE', label: isRTL ? 'صيانة' : 'Maintenance' },
    { value: 'REPAIR', label: isRTL ? 'إصلاح' : 'Repair' },
    { value: 'CLEANING', label: isRTL ? 'تنظيف' : 'Cleaning' },
    { value: 'INSPECTION', label: isRTL ? 'فحص' : 'Inspection' },
    { value: 'INSTALLATION', label: isRTL ? 'تركيب' : 'Installation' },
    { value: 'OTHER', label: isRTL ? 'أخرى' : 'Other' }
  ];

  return (
    <GlassCard className="p-8 max-w-4xl mx-auto">
      <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent mb-2">
          {isRTL ? 'إنشاء أمر عمل جديد' : 'Create New Work Order'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {isRTL ? 'قم بإضافة تفاصيل العمل المطلوب مع الصور إن أمكن' : 'Add work details with photos if available'}
        </p>
      </div>

      {!!err && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50/50 border border-rose-200 text-rose-600 text-sm">
          {err}
        </div>
      )}

      {uploadProgress !== null && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{isRTL ? 'جارٍ الرفع...' : 'Uploading...'}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-brand-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              {isRTL ? 'عنوان أمر العمل *' : 'Work Order Title *'}
            </label>
            <GlassInput
              placeholder={isRTL ? 'مثال: إصلاح تسرب في الحمام' : 'e.g. Fix bathroom leak'}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              {isRTL ? 'رقم العقار *' : 'Property ID *'}
            </label>
            <GlassInput
              placeholder={isRTL ? 'أدخل رقم العقار' : 'Enter property ID'}
              value={formData.propertyId}
              onChange={(e) => handleInputChange('propertyId', e.target.value)}
              className="w-full"
              disabled={!!prefilledPropertyId}
            />
          </div>
        </div>

        {/* Priority and Category */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              {isRTL ? 'الأولوية' : 'Priority'}
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass bg-white/50 dark:bg-slate-900/40 border border-white/30 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {priorities.map(p => (
                <option key={p.value} value={p.value} className={p.color}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70">
              {isRTL ? 'فئة العمل' : 'Category'}
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass bg-white/50 dark:bg-slate-900/40 border border-white/30 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2 opacity-70">
            {isRTL ? 'وصف تفصيلي للعمل المطلوب *' : 'Detailed Work Description *'}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            placeholder={isRTL ? 'اشرح المشكلة أو العمل المطلوب بالتفصيل...' : 'Describe the issue or work required in detail...'}
            className="w-full px-4 py-3 rounded-xl glass bg-white/50 dark:bg-slate-900/40 border border-white/30 dark:border-white/10 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
          />
        </div>

        {/* Photo Upload Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Before Photos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium opacity-70">
                {isRTL ? 'صور ما قبل العمل' : 'Before Photos'}
              </label>
              <span className="text-xs opacity-50">
                {beforePhotos.length}/5 {isRTL ? 'صور' : 'photos'}
              </span>
            </div>
            
            <div
              onClick={() => beforeInputRef.current?.click()}
              className="border-2 border-dashed border-brand-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all"
            >
              <div className="text-4xl mb-2 opacity-40">📷</div>
              <p className="text-sm opacity-70 mb-1">
                {isRTL ? 'انقر لإضافة صور' : 'Click to add photos'}
              </p>
              <p className="text-xs opacity-50">
                {isRTL ? 'حد أقصى 10 ميجابايت لكل صورة' : 'Max 10MB per image'}
              </p>
            </div>

            <input
              ref={beforeInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect('before', e.target.files)}
              className="hidden"
            />

            {beforePhotos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {beforePhotos.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Before ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-white/30"
                    />
                    <button
                      onClick={() => removePhoto('before', index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* After Photos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium opacity-70">
                {isRTL ? 'صور ما بعد العمل' : 'After Photos'}
              </label>
              <span className="text-xs opacity-50">
                {afterPhotos.length}/5 {isRTL ? 'صور' : 'photos'}
              </span>
            </div>
            
            <div
              onClick={() => afterInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
            >
              <div className="text-4xl mb-2 opacity-40">📸</div>
              <p className="text-sm opacity-70 mb-1">
                {isRTL ? 'انقر لإضافة صور' : 'Click to add photos'}
              </p>
              <p className="text-xs opacity-50">
                {isRTL ? 'حد أقصى 10 ميجابايت لكل صورة' : 'Max 10MB per image'}
              </p>
            </div>

            <input
              ref={afterInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect('after', e.target.files)}
              className="hidden"
            />

            {afterPhotos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {afterPhotos.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`After ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-white/30"
                    />
                    <button
                      onClick={() => removePhoto('after', index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className={`flex gap-4 pt-4 border-t border-white/30 dark:border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {onClose && (
            <GlassButton
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/20"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </GlassButton>
          )}
          
          <GlassButton
            onClick={submit}
            disabled={submitting || !formData.title.trim() || !formData.description.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-brand-500 to-indigo-500 text-white"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {isRTL ? 'جارٍ الإنشاء...' : 'Creating...'}
              </span>
            ) : (
              <>
                <span className="text-lg mr-1">🛠️</span>
                {isRTL ? 'إنشاء أمر العمل' : 'Create Work Order'}
              </>
            )}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}
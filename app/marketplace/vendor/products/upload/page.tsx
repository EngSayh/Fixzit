'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { X, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import toast, { Toaster } from 'react-hot-toast';
import { FormWithNavigation } from '@/components/ui/navigation-buttons';

import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

interface ProductImage {
  id: string;
  file: File;
  preview: string;
  role: 'GALLERY' | 'THUMBNAIL';
}

export default function VendorProductUploadPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);

  const [formData, setFormData] = useState({
    titleEn: '',
    titleAr: '',
    sku: '',
    brand: '',
    summary: '',
    description: '',
    category: '',
    price: '',
    currency: 'SAR',
    uom: 'EA',
    minQty: '1',
    leadDays: '7',
    stock: '0',
    standards: '',
    specifications: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ProductImage[] = files.map((file, index) => ({
      id: nanoid(),
      file,
      preview: URL.createObjectURL(file),
      role: index === 0 ? 'THUMBNAIL' : 'GALLERY'
    }));
    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titleEn || !formData.sku || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one product image');
      return;
    }

    const orgId = session?.user?.orgId;
    if (!orgId) {
      toast.error('Organization ID not found');
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Upload images
      const uploadedImages = await Promise.all(
        images.map(async (img) => {
          const imageFormData = new FormData();
          imageFormData.append('file', img.file);
          imageFormData.append('role', img.role);
          
          const res = await fetch(`/api/org/${orgId}/marketplace/vendor/upload-image`, {
            method: 'POST',
            headers: {
              'x-tenant-id': orgId
            },
            body: imageFormData
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Image upload failed' }));
            throw new Error(errorData.message || 'Image upload failed');
          }
          const data = await res.json();
          return {
            url: data.url,
            role: img.role,
            alt: formData.titleEn
          };
        })
      ).catch(error => {
        logger.error('Failed to upload one or more images', { error });
        throw new Error(`Image upload failed: ${error.message}`);
      });

      // Step 2: Create product
      const product = {
        slug: formData.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku: formData.sku,
        title: {
          en: formData.titleEn,
          ar: formData.titleAr || formData.titleEn
        },
        brand: formData.brand,
        summary: formData.summary,
        description: formData.description,
        category: formData.category,
        media: uploadedImages,
        buy: {
          price: parseFloat(formData.price),
          currency: formData.currency,
          uom: formData.uom,
          minQty: parseInt(formData.minQty, 10),
          leadDays: parseInt(formData.leadDays, 10)
        },
        stock: {
          onHand: parseInt(formData.stock, 10),
          reserved: 0
        },
        standards: formData.standards ? formData.standards.split(',').map(s => s.trim()) : [],
        specifications: formData.specifications ? JSON.parse(formData.specifications) : {},
        status: 'PENDING_APPROVAL'
      };

      const response = await fetch(`/api/org/${orgId}/marketplace/vendor/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': orgId
        },
        body: JSON.stringify(product)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create product');
      }

      toast.success('Product uploaded successfully! Pending admin approval.');
      
      setTimeout(() => {
        router.push('/marketplace/vendor/products');
      }, 2000);

    } catch (error) {
      logger.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <Toaster position="top-right" />
      
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t('marketplace.vendor.uploadProduct', 'Upload Product')}
          </h1>
          <p className="text-muted-foreground mt-2">
            Add a new product to your catalogue
          </p>
        </header>

        <FormWithNavigation 
          onSubmit={handleSubmit} 
          saving={loading}
          showBack
          showHome
          position="both"
        >
          {/* Basic Information */}
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Product Title (English) *
                </label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Product Title (Arabic)
                </label>
                <input
                  type="text"
                  value={formData.titleAr}
                  onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={2}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Product Images *</h2>
            
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-4">
              {images.map((img, index) => (
                <div key={img.id} className="relative aspect-square rounded-2xl border border-border overflow-hidden">
                  <Image src={img.preview} alt="Product" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 end-2 rounded-full bg-destructive/80 p-1 text-white hover:bg-destructive"
                  >
                    <X size={16} />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 start-2 rounded bg-primary px-2 py-1 text-xs font-medium text-white">
                      Main
                    </span>
                  )}
                </div>
              ))}
              
              <label className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted transition-colors">
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Add Image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Upload up to 8 images. First image will be the main product image.
            </p>
          </div>

          {/* Pricing & Inventory */}
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Pricing & Inventory</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="AED">AED</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Unit of Measure
                </label>
                <select
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="EA">Each (EA)</option>
                  <option value="BOX">Box</option>
                  <option value="KG">Kilogram (KG)</option>
                  <option value="M">Meter (M)</option>
                  <option value="L">Liter (L)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  value={formData.minQty}
                  onChange={(e) => setFormData({ ...formData, minQty: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  value={formData.leadDays}
                  onChange={(e) => setFormData({ ...formData, leadDays: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Technical Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Standards (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.standards}
                  onChange={(e) => setFormData({ ...formData, standards: e.target.value })}
                  placeholder="e.g., ASTM, BS EN, ISO 9001"
                  className="w-full rounded-2xl border border-border px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Specifications (JSON format)
                </label>
                <textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder='{"Material": "Steel", "Size": "100mm", "Weight": "5kg"}'
                  rows={4}
                  className="w-full rounded-2xl border border-border px-3 py-2 font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </FormWithNavigation>
      </div>
    </div>
  );
}

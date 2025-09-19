const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const mime = require('mime-types');
const sharp = require('sharp');
const crypto = require('crypto');

class CDNManager {
  constructor(options = {}) {
    this.config = {
      provider: process.env.CDN_PROVIDER || 'cloudfront', // 'cloudfront', 'cloudflare', 'local'
      aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        s3Bucket: process.env.S3_BUCKET_NAME,
        cloudfrontDistribution: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN
      },
      cloudflare: {
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        zoneId: process.env.CLOUDFLARE_ZONE_ID,
        domain: process.env.CLOUDFLARE_DOMAIN
      },
      local: {
        staticPath: process.env.STATIC_PATH || './public',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
      },
      imageOptimization: {
        quality: 85,
        formats: ['webp', 'jpeg'],
        sizes: [150, 300, 600, 1200, 1920],
        enableLazyLoading: true
      },
      caching: {
        defaultTTL: 31536000, // 1 year
        htmlTTL: 3600, // 1 hour
        apiTTL: 300, // 5 minutes
        imageTTL: 2592000 // 30 days
      },
      compression: {
        enabled: true,
        level: 6,
        threshold: 1024 // Compress files larger than 1KB
      },
      ...options
    };

    this.s3 = null;
    this.cloudfront = null;
    this.uploadQueue = [];
    this.isProcessingQueue = false;

    this.initialize();
  }

  async initialize() {
    if (this.config.provider === 'cloudfront') {
      this.initializeAWS();
    }
    
    console.log(`✅ CDN Manager initialized with provider: ${this.config.provider}`);
  }

  initializeAWS() {
    if (!this.config.aws.accessKeyId || !this.config.aws.secretAccessKey) {
      console.warn('⚠️ AWS credentials not provided, CDN features will be limited');
      return;
    }

    AWS.config.update({
      accessKeyId: this.config.aws.accessKeyId,
      secretAccessKey: this.config.aws.secretAccessKey,
      region: this.config.aws.region
    });

    this.s3 = new AWS.S3();
    this.cloudfront = new AWS.CloudFront();
  }

  // File Upload and Management
  async uploadFile(filePath, key, options = {}) {
    const {
      contentType,
      cacheControl,
      metadata = {},
      public = true,
      optimize = false
    } = options;

    try {
      let fileBuffer;
      let finalContentType;

      if (typeof filePath === 'string') {
        fileBuffer = await fs.readFile(filePath);
        finalContentType = contentType || mime.lookup(filePath) || 'application/octet-stream';
      } else {
        fileBuffer = filePath; // Assume it's already a buffer
        finalContentType = contentType || 'application/octet-stream';
      }

      // Optimize images if requested
      if (optimize && this.isImageFile(finalContentType)) {
        fileBuffer = await this.optimizeImage(fileBuffer, options.imageOptions);
      }

      // Compress if enabled and file is large enough
      if (this.config.compression.enabled && fileBuffer.length > this.config.compression.threshold) {
        fileBuffer = await this.compressFile(fileBuffer, finalContentType);
      }

      const result = await this.uploadToProvider(key, fileBuffer, {
        contentType: finalContentType,
        cacheControl: cacheControl || this.getCacheControl(finalContentType),
        metadata,
        public
      });

      return result;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  async uploadToProvider(key, buffer, options) {
    switch (this.config.provider) {
      case 'cloudfront':
        return await this.uploadToS3(key, buffer, options);
      case 'cloudflare':
        return await this.uploadToCloudflare(key, buffer, options);
      case 'local':
        return await this.uploadToLocal(key, buffer, options);
      default:
        throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
    }
  }

  async uploadToS3(key, buffer, options) {
    if (!this.s3) {
      throw new Error('S3 not initialized');
    }

    const params = {
      Bucket: this.config.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
      CacheControl: options.cacheControl,
      Metadata: options.metadata
    };

    if (options.public) {
      params.ACL = 'public-read';
    }

    const result = await this.s3.upload(params).promise();
    
    return {
      url: this.config.aws.cloudfrontDomain ? 
        `https://${this.config.aws.cloudfrontDomain}/${key}` : 
        result.Location,
      key,
      etag: result.ETag,
      size: buffer.length
    };
  }

  async uploadToCloudflare(key, buffer, options) {
    // Implement Cloudflare R2 upload
    throw new Error('Cloudflare upload not implemented yet');
  }

  async uploadToLocal(key, buffer, options) {
    const fullPath = path.join(this.config.local.staticPath, key);
    const directory = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, buffer);
    
    return {
      url: `${this.config.local.baseUrl}/${key}`,
      key,
      size: buffer.length,
      path: fullPath
    };
  }

  // Image Optimization
  async optimizeImage(buffer, options = {}) {
    const {
      quality = this.config.imageOptimization.quality,
      format = 'webp',
      width,
      height,
      fit = 'cover'
    } = options;

    let sharpInstance = sharp(buffer);

    // Resize if dimensions provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, { fit });
    }

    // Convert format and set quality
    switch (format) {
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
    }

    return await sharpInstance.toBuffer();
  }

  async generateResponsiveImages(buffer, key, options = {}) {
    const {
      sizes = this.config.imageOptimization.sizes,
      formats = this.config.imageOptimization.formats
    } = options;

    const results = [];
    const keyWithoutExt = key.replace(/\.[^/.]+$/, '');

    for (const size of sizes) {
      for (const format of formats) {
        try {
          const optimizedBuffer = await this.optimizeImage(buffer, {
            width: size,
            format,
            ...options
          });

          const responsiveKey = `${keyWithoutExt}_${size}w.${format}`;
          const result = await this.uploadToProvider(responsiveKey, optimizedBuffer, {
            contentType: `image/${format}`,
            cacheControl: this.getCacheControl(`image/${format}`),
            public: true
          });

          results.push({
            ...result,
            width: size,
            format
          });
        } catch (error) {
          console.error(`Failed to generate responsive image ${size}w.${format}:`, error);
        }
      }
    }

    return results;
  }

  // File Compression
  async compressFile(buffer, contentType) {
    const zlib = require('zlib');
    
    // Only compress text-based files
    if (this.isCompressibleType(contentType)) {
      return zlib.gzipSync(buffer, { level: this.config.compression.level });
    }
    
    return buffer;
  }

  isCompressibleType(contentType) {
    const compressibleTypes = [
      'text/',
      'application/javascript',
      'application/json',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml'
    ];
    
    return compressibleTypes.some(type => contentType.startsWith(type));
  }

  // Cache Management
  getCacheControl(contentType) {
    if (contentType.startsWith('text/html')) {
      return `public, max-age=${this.config.caching.htmlTTL}`;
    }
    
    if (contentType.startsWith('image/')) {
      return `public, max-age=${this.config.caching.imageTTL}`;
    }
    
    if (contentType.includes('json')) {
      return `public, max-age=${this.config.caching.apiTTL}`;
    }
    
    return `public, max-age=${this.config.caching.defaultTTL}`;
  }

  async invalidateCache(paths) {
    switch (this.config.provider) {
      case 'cloudfront':
        return await this.invalidateCloudFront(paths);
      case 'cloudflare':
        return await this.invalidateCloudflare(paths);
      case 'local':
        return { success: true, message: 'Local cache invalidation not needed' };
      default:
        throw new Error(`Cache invalidation not supported for provider: ${this.config.provider}`);
    }
  }

  async invalidateCloudFront(paths) {
    if (!this.cloudfront) {
      throw new Error('CloudFront not initialized');
    }

    const params = {
      DistributionId: this.config.aws.cloudfrontDistribution,
      InvalidationBatch: {
        CallerReference: `invalidation_${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths.map(path => path.startsWith('/') ? path : `/${path}`)
        }
      }
    };

    const result = await this.cloudfront.createInvalidation(params).promise();
    
    return {
      success: true,
      invalidationId: result.Invalidation.Id,
      status: result.Invalidation.Status
    };
  }

  async invalidateCloudflare(paths) {
    // Implement Cloudflare cache purging
    throw new Error('Cloudflare cache invalidation not implemented yet');
  }

  // Batch Upload Processing
  async addToUploadQueue(files) {
    this.uploadQueue.push(...files);
    
    if (!this.isProcessingQueue) {
      this.processUploadQueue();
    }
  }

  async processUploadQueue() {
    if (this.uploadQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const batchSize = 5; // Process 5 files at a time
    
    while (this.uploadQueue.length > 0) {
      const batch = this.uploadQueue.splice(0, batchSize);
      
      const promises = batch.map(async (file) => {
        try {
          const result = await this.uploadFile(file.path, file.key, file.options);
          console.log(`✅ Uploaded: ${file.key}`);
          return { success: true, file: file.key, result };
        } catch (error) {
          console.error(`❌ Failed to upload: ${file.key}`, error);
          return { success: false, file: file.key, error: error.message };
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches to avoid overwhelming the service
      if (this.uploadQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessingQueue = false;
  }

  // Asset Management
  async deleteFile(key) {
    switch (this.config.provider) {
      case 'cloudfront':
        return await this.deleteFromS3(key);
      case 'local':
        return await this.deleteFromLocal(key);
      default:
        throw new Error(`Delete not supported for provider: ${this.config.provider}`);
    }
  }

  async deleteFromS3(key) {
    if (!this.s3) {
      throw new Error('S3 not initialized');
    }

    const params = {
      Bucket: this.config.aws.s3Bucket,
      Key: key
    };

    await this.s3.deleteObject(params).promise();
    return { success: true, key };
  }

  async deleteFromLocal(key) {
    const fullPath = path.join(this.config.local.staticPath, key);
    
    try {
      await fs.unlink(fullPath);
      return { success: true, key };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, key, message: 'File not found' };
      }
      throw error;
    }
  }

  // URL Generation
  getAssetUrl(key, options = {}) {
    const { 
      width, 
      height, 
      format, 
      quality,
      secure = true 
    } = options;

    let baseUrl;
    switch (this.config.provider) {
      case 'cloudfront':
        baseUrl = `http${secure ? 's' : ''}://${this.config.aws.cloudfrontDomain}`;
        break;
      case 'cloudflare':
        baseUrl = `http${secure ? 's' : ''}://${this.config.cloudflare.domain}`;
        break;
      case 'local':
        baseUrl = this.config.local.baseUrl;
        break;
      default:
        throw new Error(`URL generation not supported for provider: ${this.config.provider}`);
    }

    let url = `${baseUrl}/${key}`;

    // Add image transformation parameters if supported
    if (width || height || format || quality) {
      const params = new URLSearchParams();
      if (width) params.append('w', width.toString());
      if (height) params.append('h', height.toString());
      if (format) params.append('f', format);
      if (quality) params.append('q', quality.toString());
      
      url += `?${params.toString()}`;
    }

    return url;
  }

  generateSrcSet(key, options = {}) {
    const { 
      sizes = this.config.imageOptimization.sizes,
      format = 'webp' 
    } = options;

    return sizes.map(size => {
      const url = this.getAssetUrl(key, { width: size, format, ...options });
      return `${url} ${size}w`;
    }).join(', ');
  }

  // Utility Methods
  isImageFile(contentType) {
    return contentType && contentType.startsWith('image/');
  }

  generateHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  getFileExtension(contentType) {
    return mime.extension(contentType) || 'bin';
  }

  // Middleware for Express
  createMiddleware() {
    return (req, res, next) => {
      // Add CDN helper methods to response object
      res.assetUrl = (key, options) => this.getAssetUrl(key, options);
      res.generateSrcSet = (key, options) => this.generateSrcSet(key, options);
      
      // Add upload helper to request object
      req.uploadToCDN = async (file, key, options) => {
        return await this.uploadFile(file, key, options);
      };

      next();
    };
  }

  // Health Check
  async healthCheck() {
    const health = {
      provider: this.config.provider,
      status: 'unknown',
      uploadQueue: this.uploadQueue.length,
      timestamp: new Date()
    };

    try {
      switch (this.config.provider) {
        case 'cloudfront':
          if (this.s3) {
            await this.s3.headBucket({ Bucket: this.config.aws.s3Bucket }).promise();
            health.status = 'healthy';
            health.s3Connected = true;
          } else {
            health.status = 'not_configured';
            health.s3Connected = false;
          }
          break;
        case 'local':
          try {
            await fs.access(this.config.local.staticPath);
            health.status = 'healthy';
            health.staticPathExists = true;
          } catch (error) {
            health.status = 'unhealthy';
            health.staticPathExists = false;
            health.error = error.message;
          }
          break;
        default:
          health.status = 'not_configured';
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  // Statistics
  getStats() {
    return {
      provider: this.config.provider,
      uploadQueueSize: this.uploadQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      config: {
        imageOptimization: this.config.imageOptimization,
        caching: this.config.caching,
        compression: this.config.compression
      }
    };
  }
}

module.exports = CDNManager;
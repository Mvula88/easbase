import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'crypto';
import mime from 'mime-types';

interface UploadOptions {
  bucket?: string;
  path?: string;
  public?: boolean;
  metadata?: Record<string, any>;
  transform?: ImageTransformOptions;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  resize?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  signedUrl?: string;
  metadata?: Record<string, any>;
  uploadedAt: Date;
}

export class StorageService {
  private supabase: SupabaseClient;
  private projectId: string;
  private cdnUrl: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.cdnUrl = process.env.CDN_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  }

  // File Upload
  async upload(
    file: Buffer | Blob | File,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<FileMetadata> {
    const {
      bucket = 'uploads',
      path = '',
      public: isPublic = false,
      metadata = {},
      transform,
      maxSize,
      allowedTypes
    } = options;

    // Validate file size
    const fileSize = file instanceof Buffer ? file.length : (file as File).size;
    if (maxSize && fileSize > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Validate file type
    const fileType = mime.lookup(fileName) || 'application/octet-stream';
    if (allowedTypes && !allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Process image if transform options provided
    let processedFile = file;
    let processedFileName = fileName;
    
    if (transform && this.isImage(fileType)) {
      const result = await this.transformImage(file, transform);
      processedFile = result.buffer;
      processedFileName = this.updateFileExtension(fileName, transform.format);
    }

    // Generate unique file path
    const fileId = crypto.randomBytes(16).toString('hex');
    const fullPath = this.buildPath(path, fileId, processedFileName);

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fullPath, processedFile, {
        contentType: fileType,
        upsert: false,
        cacheControl: '3600'
      });

    if (error) throw error;

    // Store file metadata in database
    const fileMetadata = await this.storeFileMetadata({
      file_id: fileId,
      bucket,
      path: data.path,
      name: processedFileName,
      size: fileSize,
      type: fileType,
      is_public: isPublic,
      metadata: {
        ...metadata,
        original_name: fileName,
        transformed: !!transform
      }
    });

    // Get public URL or signed URL
    const url = isPublic 
      ? this.getPublicUrl(bucket, data.path)
      : await this.createSignedUrl(bucket, data.path);

    return {
      id: fileId,
      name: processedFileName,
      size: fileSize,
      type: fileType,
      url,
      signedUrl: isPublic ? undefined : url,
      metadata: fileMetadata.metadata,
      uploadedAt: new Date(fileMetadata.created_at)
    };
  }

  // Bulk Upload
  async uploadMultiple(
    files: Array<{ file: Buffer | Blob | File; name: string }>,
    options: UploadOptions = {}
  ) {
    const results = await Promise.allSettled(
      files.map(({ file, name }) => this.upload(file, name, options))
    );

    return {
      successful: results.filter(r => r.status === 'fulfilled').map(r => (r as any).value),
      failed: results.filter(r => r.status === 'rejected').map((r, i) => ({
        fileName: files[i].name,
        error: (r as any).reason.message
      }))
    };
  }

  // Direct Upload (Presigned URL)
  async createUploadUrl(fileName: string, options: UploadOptions = {}) {
    const { bucket = 'uploads', path = '' } = options;
    const fileId = crypto.randomBytes(16).toString('hex');
    const fullPath = this.buildPath(path, fileId, fileName);

    // Create signed upload URL
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUploadUrl(fullPath);

    if (error) throw error;

    return {
      uploadUrl: data.signedUrl,
      token: data.token,
      path: fullPath,
      fileId
    };
  }

  // File Download
  async download(fileId: string) {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) throw new Error('File not found');

    const { data, error } = await this.supabase.storage
      .from(metadata.bucket)
      .download(metadata.path);

    if (error) throw error;
    return data;
  }

  // File Deletion
  async delete(fileId: string) {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) throw new Error('File not found');

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from(metadata.bucket)
      .remove([metadata.path]);

    if (storageError) throw storageError;

    // Delete metadata
    const { error: dbError } = await this.supabase
      .from('file_storage')
      .delete()
      .eq('file_id', fileId)
      .eq('project_id', this.projectId);

    if (dbError) throw dbError;

    return { success: true };
  }

  async deleteMultiple(fileIds: string[]) {
    const results = await Promise.allSettled(
      fileIds.map(id => this.delete(id))
    );

    return {
      deleted: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }

  // Signed URLs
  async createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  async refreshSignedUrl(fileId: string, expiresIn = 3600) {
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) throw new Error('File not found');

    return this.createSignedUrl(metadata.bucket, metadata.path, expiresIn);
  }

  // Image Processing
  async transformImage(
    input: Buffer | Blob | File,
    options: ImageTransformOptions
  ) {
    const buffer = input instanceof Buffer 
      ? input 
      : Buffer.from(await (input as Blob).arrayBuffer());

    let transform = sharp(buffer);

    // Apply resize
    if (options.width || options.height) {
      transform = transform.resize(options.width, options.height, {
        fit: options.resize || 'cover',
        withoutEnlargement: true
      });
    }

    // Apply format conversion
    if (options.format) {
      transform = transform.toFormat(options.format, {
        quality: options.quality || 80
      });
    }

    // Apply quality for JPEG/WebP
    if (options.quality && !options.format) {
      transform = transform.jpeg({ quality: options.quality });
    }

    const outputBuffer = await transform.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: outputBuffer.length
      }
    };
  }

  async generateThumbnail(fileId: string, width = 200, height = 200) {
    const file = await this.download(fileId);
    const metadata = await this.getFileMetadata(fileId);
    
    if (!metadata || !this.isImage(metadata.type)) {
      throw new Error('File is not an image');
    }

    const thumbnail = await this.transformImage(file, {
      width,
      height,
      resize: 'cover',
      format: 'jpeg',
      quality: 70
    });

    // Upload thumbnail
    const thumbnailName = `thumb_${width}x${height}_${metadata.name}`;
    return this.upload(thumbnail.buffer, thumbnailName, {
      bucket: metadata.bucket,
      path: 'thumbnails',
      public: metadata.is_public,
      metadata: {
        original_file_id: fileId,
        is_thumbnail: true
      }
    });
  }

  // CDN Integration
  getCDNUrl(fileId: string, transforms?: string) {
    // Example: /cdn/files/{fileId}?w=200&h=200&q=80
    const baseUrl = `${this.cdnUrl}/cdn/files/${fileId}`;
    return transforms ? `${baseUrl}?${transforms}` : baseUrl;
  }

  getOptimizedImageUrl(fileId: string, options: ImageTransformOptions) {
    const params = new URLSearchParams();
    
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('f', options.format);
    
    return this.getCDNUrl(fileId, params.toString());
  }

  // File Management
  async listFiles(options: { 
    bucket?: string; 
    path?: string; 
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) {
    const { 
      bucket = 'uploads', 
      path = '', 
      limit = 100,
      offset = 0,
      search
    } = options;

    let query = this.supabase
      .from('file_storage')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('bucket', bucket);

    if (path) {
      query = query.ilike('path', `${path}%`);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data.map(file => ({
      id: file.file_id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.is_public 
        ? this.getPublicUrl(file.bucket, file.path)
        : undefined,
      metadata: file.metadata,
      uploadedAt: new Date(file.created_at)
    }));
  }

  async getFileMetadata(fileId: string) {
    const { data, error } = await this.supabase
      .from('file_storage')
      .select('*')
      .eq('file_id', fileId)
      .eq('project_id', this.projectId)
      .single();

    if (error) return null;
    return data;
  }

  async updateFileMetadata(fileId: string, metadata: Record<string, any>) {
    const { data, error } = await this.supabase
      .from('file_storage')
      .update({ 
        metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('file_id', fileId)
      .eq('project_id', this.projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Storage Analytics
  async getStorageUsage() {
    const { data, error } = await this.supabase
      .from('file_storage')
      .select('size, type')
      .eq('project_id', this.projectId);

    if (error) throw error;

    const totalSize = data.reduce((sum, file) => sum + file.size, 0);
    const byType = data.reduce((acc, file) => {
      const type = file.type.split('/')[0];
      acc[type] = (acc[type] || 0) + file.size;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSize,
      totalFiles: data.length,
      byType,
      humanReadable: this.formatBytes(totalSize)
    };
  }

  // Helper Methods
  private async storeFileMetadata(data: any) {
    const { data: metadata, error } = await this.supabase
      .from('file_storage')
      .insert({
        ...data,
        project_id: this.projectId
      })
      .select()
      .single();

    if (error) throw error;
    return metadata;
  }

  private buildPath(basePath: string, fileId: string, fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const pathParts = [
      basePath,
      year.toString(),
      month,
      fileId,
      fileName
    ].filter(Boolean);
    
    return pathParts.join('/');
  }

  private getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private updateFileExtension(fileName: string, format?: string): string {
    if (!format) return fileName;
    
    const lastDot = fileName.lastIndexOf('.');
    const nameWithoutExt = lastDot > -1 ? fileName.substring(0, lastDot) : fileName;
    
    return `${nameWithoutExt}.${format}`;
  }

  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Cleanup
  async cleanupExpiredFiles(daysOld = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - daysOld);

    const { data, error } = await this.supabase
      .from('file_storage')
      .select('file_id')
      .eq('project_id', this.projectId)
      .lt('created_at', expiryDate.toISOString())
      .eq('metadata->temporary', true);

    if (error) throw error;

    const fileIds = data.map(f => f.file_id);
    return this.deleteMultiple(fileIds);
  }
}
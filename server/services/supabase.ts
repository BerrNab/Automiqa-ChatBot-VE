import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private bucketName = 'chatbot-logos';
  private kbBucketName = 'kb-docs';
  private isConfigured = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured. Logo upload functionality will be disabled.');
      return;
    }

    try {
      this.client = createClient(supabaseUrl, supabaseKey);
      this.isConfigured = true;
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }

  public isAvailable(): boolean {
    return this.isConfigured && this.client !== null;
  }

  async uploadFile(chatbotId: string, file: Buffer, contentType: string): Promise<string> {
    if (!this.client) {
      throw new Error('Supabase client not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    // Generate unique filename with timestamp and UUID
    const fileExtension = this.getFileExtension(contentType);
    const fileName = `${chatbotId}/${Date.now()}-${randomUUID()}.${fileExtension}`;

    try {
      // Upload file to Supabase storage
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get public URL for the uploaded file
      const { data: urlData } = this.client.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('File upload failed:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async deleteFile(logoUrl: string): Promise<void> {
    if (!this.client) {
      console.warn('Supabase client not configured. Skipping logo deletion.');
      return;
    }

    try {
      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(logoUrl);
      
      if (!filePath) {
        console.warn('Could not extract file path from URL:', logoUrl);
        return;
      }

      const { error } = await this.client.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error: any) {
      console.error('File deletion failed:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  private getFileExtension(contentType: string): string {
    const mimeTypes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/webp': 'webp',
    };

    return mimeTypes[contentType] || 'png';
  }

  private extractFilePathFromUrl(url: string): string | null {
    try {
      // Extract path after storage/v1/object/public/{bucket}/
      const match = url.match(new RegExp(`${this.bucketName}/(.+)$`));
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async ensureBucketExists(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.client.storage.listBuckets();

      if (listError) {
        console.error('Failed to list buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      const kbBucketExists = buckets?.some(bucket => bucket.name === this.kbBucketName);

      if (!bucketExists) {
        // Create bucket with public access
        const { error: createError } = await this.client.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
          fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
        });

        if (createError) {
          console.error('Failed to create bucket:', createError);
        } else {
          console.log(`Created Supabase storage bucket: ${this.bucketName}`);
        }
      }

      // Create KB documents bucket if it doesn't exist
      if (!kbBucketExists) {
        const { error: createError } = await this.client.storage.createBucket(this.kbBucketName, {
          public: false, // Private bucket for KB documents
          allowedMimeTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/json',
            'text/plain'
          ],
          fileSizeLimit: 10 * 1024 * 1024, // 10MB limit for documents
        });

        if (createError) {
          console.error('Failed to create KB bucket:', createError);
        } else {
          console.log(`Created Supabase storage bucket: ${this.kbBucketName}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring buckets exist:', error);
    }
  }

  // KB Document methods
  async uploadKBDocument(chatbotId: string, file: Buffer, filename: string, contentType: string): Promise<string> {
    if (!this.client) {
      throw new Error('Supabase client not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    // Generate unique filename with timestamp and UUID
    const fileExtension = filename.split('.').pop() || 'txt';
    const fileName = `${chatbotId}/${Date.now()}-${randomUUID()}.${fileExtension}`;

    try {
      // Upload file to Supabase storage
      const { data, error } = await this.client.storage
        .from(this.kbBucketName)
        .upload(fileName, file, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Supabase KB upload error:', error);
        throw new Error(`Failed to upload KB document: ${error.message}`);
      }

      return fileName;
    } catch (error: any) {
      console.error('KB document upload failed:', error);
      throw new Error(`KB document upload failed: ${error.message}`);
    }
  }

  async getKBDocumentUrl(storagePath: string): Promise<string> {
    if (!this.client) {
      throw new Error('Supabase client not configured.');
    }

    try {
      const { data, error } = await this.client.storage
        .from(this.kbBucketName)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        throw new Error(`Failed to get KB document URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('Failed to get KB document URL:', error);
      throw new Error(`Failed to get KB document URL: ${error.message}`);
    }
  }

  async downloadKBDocument(storagePath: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('Supabase client not configured.');
    }

    try {
      const { data, error } = await this.client.storage
        .from(this.kbBucketName)
        .download(storagePath);

      if (error) {
        throw new Error(`Failed to download KB document: ${error.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      return buffer;
    } catch (error: any) {
      console.error('Failed to download KB document:', error);
      throw new Error(`Failed to download KB document: ${error.message}`);
    }
  }

  async deleteKBDocument(storagePath: string): Promise<void> {
    if (!this.client) {
      console.warn('Supabase client not configured. Skipping KB document deletion.');
      return;
    }

    try {
      const { error } = await this.client.storage
        .from(this.kbBucketName)
        .remove([storagePath]);

      if (error) {
        console.error('Supabase KB delete error:', error);
        throw new Error(`Failed to delete KB document: ${error.message}`);
      }
    } catch (error: any) {
      console.error('KB document deletion failed:', error);
      throw new Error(`KB document deletion failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();

// Initialize bucket on startup
supabaseService.ensureBucketExists().catch(console.error);
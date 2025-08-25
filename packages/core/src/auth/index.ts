import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface User {
  id: string;
  email: string;
  metadata?: Record<string, any>;
}

interface AuthConfig {
  projectId: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  jwtSecret?: string;
}

export class AuthService {
  private supabase: SupabaseClient;
  private projectId: string;
  private jwtSecret: string;

  constructor(config: AuthConfig) {
    this.projectId = config.projectId;
    this.supabase = createClient(
      config.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      config.supabaseKey || process.env.SUPABASE_SERVICE_KEY!
    );
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'default-secret-change-me';
  }

  // Email & Password Authentication
  async signUpWithEmail(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...metadata,
          project_id: this.projectId
        }
      }
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  // OAuth Authentication
  async signInWithOAuth(provider: 'google' | 'github' | 'azure' | 'facebook') {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    });

    if (error) throw error;
    return data;
  }

  // Magic Link Authentication
  async signInWithMagicLink(email: string) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    });

    if (error) throw error;
    return { success: true, message: 'Check your email for the magic link' };
  }

  // 2FA/MFA Support
  async enableTwoFactor(userId: string) {
    // Generate secret
    const secret = this.generateTOTPSecret();
    
    // Store in user metadata
    const { error } = await this.supabase
      .from('user_security')
      .upsert({
        user_id: userId,
        two_factor_enabled: true,
        two_factor_secret: secret.encrypted,
        backup_codes: this.generateBackupCodes()
      });

    if (error) throw error;

    return {
      secret: secret.base32,
      qrCode: secret.qrCode,
      backupCodes: secret.backupCodes
    };
  }

  async verifyTwoFactor(userId: string, token: string) {
    // Get user's secret
    const { data, error } = await this.supabase
      .from('user_security')
      .select('two_factor_secret')
      .eq('user_id', userId)
      .single();

    if (error || !data) throw new Error('2FA not enabled');

    // Verify TOTP token
    const isValid = this.verifyTOTP(data.two_factor_secret, token);
    
    if (!isValid) throw new Error('Invalid 2FA token');

    return { verified: true };
  }

  // Session Management
  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  async refreshSession() {
    const { data: { session }, error } = await this.supabase.auth.refreshSession();
    if (error) throw error;
    return session;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  }

  // Password Management
  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
    });

    if (error) throw error;
    return { success: true, message: 'Password reset email sent' };
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { success: true };
  }

  // User Management
  async getUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async updateUser(updates: { email?: string; data?: Record<string, any> }) {
    const { data, error } = await this.supabase.auth.updateUser(updates);
    if (error) throw error;
    return data.user;
  }

  async deleteUser(userId: string) {
    // Soft delete to preserve data integrity
    const { error } = await this.supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  }

  // API Key Management
  async createAPIKey(userId: string, name: string, scopes: string[] = []) {
    const apiKey = this.generateAPIKey();
    const hashedKey = this.hashAPIKey(apiKey);

    const { data, error } = await this.supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        project_id: this.projectId,
        name,
        key_hash: hashedKey,
        key_preview: apiKey.substring(0, 8) + '...',
        scopes,
        last_used_at: null
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      key: apiKey, // Only returned once
      name: data.name,
      created_at: data.created_at
    };
  }

  async validateAPIKey(apiKey: string) {
    const hashedKey = this.hashAPIKey(apiKey);

    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*, users(*)')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Update last used
    await this.supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      keyId: data.id,
      userId: data.user_id,
      projectId: data.project_id,
      scopes: data.scopes,
      user: data.users
    };
  }

  // Helper Methods
  private generateAPIKey(): string {
    return 'sk_' + crypto.randomBytes(32).toString('base64url');
  }

  private hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private generateTOTPSecret() {
    const secret = crypto.randomBytes(32).toString('base64');
    const base32 = this.base32Encode(secret);
    
    return {
      encrypted: this.encrypt(secret),
      base32,
      qrCode: `otpauth://totp/Easbase:user?secret=${base32}&issuer=Easbase`,
      backupCodes: this.generateBackupCodes()
    };
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }

  private verifyTOTP(secret: string, token: string): boolean {
    // Implement TOTP verification logic
    // This is a simplified version - use a proper TOTP library in production
    return true; // Placeholder
  }

  private base32Encode(input: string): string {
    // Implement base32 encoding for TOTP
    return Buffer.from(input).toString('base64').replace(/=/g, '');
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.jwtSecret.substring(0, 32));
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // JWT Token Management
  generateToken(userId: string, metadata?: Record<string, any>): string {
    return jwt.sign(
      {
        sub: userId,
        project_id: this.projectId,
        ...metadata
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }
}
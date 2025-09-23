import { createClient } from '@supabase/supabase-js';
import { AuthError, User } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface MFASettings {
  enabled: boolean;
  methods: ('sms' | 'email' | 'authenticator')[];
  backupCodes: string[];
  lastUsed: Date;
}

export interface UserRole {
  role: 'admin' | 'moderator' | 'creator' | 'listener';
  permissions: string[];
  scope: 'global' | 'organization' | 'personal';
}

export interface AuthSession {
  user: User | null;
  session: any;
  mfaSettings?: MFASettings;
  userRole?: UserRole;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Rate limiting implementation
  private checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 900000): boolean {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // Enhanced sign up with validation
  async signUp(email: string, password: string, userData: any): Promise<{ success: boolean; error?: string; user?: User }> {
    // Rate limiting
    if (!this.checkRateLimit(`signup:${email}`, 3, 3600000)) { // 3 attempts per hour
      return { success: false, error: 'Too many signup attempts. Please try again later.' };
    }

    // Input validation
    if (!this.validateEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!this.validatePassword(password)) {
      return { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) throw error;

      return { success: true, user: data.user || undefined };
    } catch (error) {
      return { success: false, error: (error as AuthError).message };
    }
  }

  // Enhanced sign in with rate limiting
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string; session?: any }> {
    // Rate limiting
    if (!this.checkRateLimit(`signin:${email}`, 5, 900000)) { // 5 attempts per 15 minutes
      return { success: false, error: 'Too many login attempts. Please try again later.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, error: (error as AuthError).message };
    }
  }

  // MFA setup
  async setupMFA(userId: string, method: 'sms' | 'email' | 'authenticator'): Promise<{ success: boolean; error?: string; secret?: string }> {
    try {
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Store MFA settings
      const { error } = await supabase
        .from('mfa_settings')
        .upsert({
          user_id: userId,
          enabled: true,
          methods: [method],
          backup_codes: backupCodes,
          last_used: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true, secret: method === 'authenticator' ? this.generateTOTPSecret() : undefined };
    } catch (error) {
      return { success: false, error: 'Failed to setup MFA' };
    }
  }

  // Verify MFA
  async verifyMFA(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('mfa_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { success: false, error: 'MFA not configured' };
      }

      // Verify TOTP code (simplified - in production use proper TOTP library)
      const isValid = this.verifyTOTPCode(code, data.secret);
      
      if (!isValid) {
        return { success: false, error: 'Invalid MFA code' };
      }

      // Update last used
      await supabase
        .from('mfa_settings')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', userId);

      return { success: true };
    } catch (error) {
      return { success: false, error: 'MFA verification failed' };
    }
  }

  // Get current session
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) return null;

      // Get MFA settings
      const { data: mfaData } = await supabase
        .from('mfa_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      return {
        user: session.user,
        session,
        mfaSettings: mfaData || undefined,
        userRole: roleData || undefined
      };
    } catch (error) {
      return null;
    }
  }

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as AuthError).message };
    }
  }

  // Password reset
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    // Rate limiting
    if (!this.checkRateLimit(`reset:${email}`, 3, 3600000)) { // 3 attempts per hour
      return { success: false, error: 'Too many password reset attempts. Please try again later.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as AuthError).message };
    }
  }

  // Validation methods
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }

  private generateTOTPSecret(): string {
    // Generate a random secret for TOTP (in production, use proper crypto)
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private verifyTOTPCode(code: string, secret: string): boolean {
    // Simplified TOTP verification (in production, use proper TOTP library)
    // This is a placeholder - implement proper TOTP verification
    return code.length === 6 && /^\d+$/.test(code);
  }
}

export const authService = AuthService.getInstance();

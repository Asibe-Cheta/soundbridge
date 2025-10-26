declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    length?: number;
    name?: string;
    issuer?: string;
    symbols?: boolean;
    qr_codes?: boolean;
    google_auth_qr?: boolean;
    otpauth_url?: boolean;
  }

  export interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    qr_code_ascii?: string;
    qr_code_hex?: string;
    qr_code_base32?: string;
    google_auth_qr?: string;
    otpauth_url?: string;
  }

  export interface TotpVerifyOptions {
    secret: string;
    encoding?: string;
    token: string;
    window?: number;
    time?: number;
    step?: number;
  }

  export interface HotpVerifyOptions {
    secret: string;
    encoding?: string;
    token: string;
    window?: number;
    counter: number;
  }

  export function generateSecret(options?: GenerateSecretOptions): GeneratedSecret;
  export function totp(options: { secret: string; encoding?: string; time?: number; step?: number; digits?: number; algorithm?: string }): string;
  export function hotp(options: { secret: string; encoding?: string; counter: number; digits?: number; algorithm?: string }): string;
  
  export namespace totp {
    function verify(options: TotpVerifyOptions): boolean;
    function verifyDelta(options: TotpVerifyOptions): { delta: number } | undefined;
  }
  
  export namespace hotp {
    function verify(options: HotpVerifyOptions): boolean;
    function verifyDelta(options: HotpVerifyOptions): { delta: number } | undefined;
  }
}


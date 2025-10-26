declare module 'qrcode' {
  export interface QRCodeOptions {
    version?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    maskPattern?: number;
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
  }

  export interface QRCodeToDataURLOptions extends QRCodeOptions {
    rendererOpts?: {
      quality?: number;
    };
  }

  export interface QRCodeToStringOptions extends QRCodeOptions {
    type?: 'svg' | 'terminal' | 'utf8';
  }

  export interface QRCodeToFileOptions extends QRCodeOptions {
    rendererOpts?: {
      quality?: number;
    };
  }

  export interface QRCodeSegment {
    data: string | Buffer;
    mode: 'numeric' | 'alphanumeric' | 'byte' | 'kanji';
  }

  // Main API
  export function toDataURL(
    text: string | QRCodeSegment[],
    options?: QRCodeToDataURLOptions
  ): Promise<string>;
  
  export function toDataURL(
    text: string | QRCodeSegment[],
    callback: (error: Error | null, url: string) => void
  ): void;
  
  export function toDataURL(
    text: string | QRCodeSegment[],
    options: QRCodeToDataURLOptions,
    callback: (error: Error | null, url: string) => void
  ): void;

  export function toString(
    text: string | QRCodeSegment[],
    options?: QRCodeToStringOptions
  ): Promise<string>;
  
  export function toString(
    text: string | QRCodeSegment[],
    callback: (error: Error | null, string: string) => void
  ): void;
  
  export function toString(
    text: string | QRCodeSegment[],
    options: QRCodeToStringOptions,
    callback: (error: Error | null, string: string) => void
  ): void;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string | QRCodeSegment[],
    options?: QRCodeOptions
  ): Promise<any>;
  
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string | QRCodeSegment[],
    callback: (error: Error | null) => void
  ): void;
  
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string | QRCodeSegment[],
    options: QRCodeOptions,
    callback: (error: Error | null) => void
  ): void;

  export function toFile(
    path: string,
    text: string | QRCodeSegment[],
    options?: QRCodeToFileOptions
  ): Promise<any>;
  
  export function toFile(
    path: string,
    text: string | QRCodeSegment[],
    callback: (error: Error | null) => void
  ): void;
  
  export function toFile(
    path: string,
    text: string | QRCodeSegment[],
    options: QRCodeToFileOptions,
    callback: (error: Error | null) => void
  ): void;

  export function toFileStream(
    stream: NodeJS.WritableStream,
    text: string | QRCodeSegment[],
    options?: QRCodeOptions
  ): void;

  export function create(
    text: string | QRCodeSegment[],
    options?: QRCodeOptions
  ): any;
}


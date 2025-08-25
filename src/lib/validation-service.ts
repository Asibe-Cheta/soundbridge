import DOMPurify from 'isomorphic-dompurify';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  sanitize?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // Email validation
  validateEmail(email: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = email;

    // Sanitize if requested
    if (rules.sanitize) {
      sanitizedValue = this.sanitizeInput(email);
    }

    // Required check
    if (rules.required && !sanitizedValue) {
      errors.push('Email is required');
      return { isValid: false, errors, sanitizedValue };
    }

    if (sanitizedValue) {
      // Email pattern validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(sanitizedValue)) {
        errors.push('Invalid email format');
      }

      // Length validation
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(`Email must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(`Email must be no more than ${rules.maxLength} characters`);
      }

      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(sanitizedValue);
        if (typeof customResult === 'string') {
          errors.push(customResult);
        } else if (!customResult) {
          errors.push('Email validation failed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  // Password validation
  validatePassword(password: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = password;

    // Required check
    if (rules.required && !sanitizedValue) {
      errors.push('Password is required');
      return { isValid: false, errors, sanitizedValue };
    }

    if (sanitizedValue) {
      // Length validation
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(`Password must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(`Password must be no more than ${rules.maxLength} characters`);
      }

      // Default password strength validation
      if (!rules.custom) {
        const hasUpperCase = /[A-Z]/.test(sanitizedValue);
        const hasLowerCase = /[a-z]/.test(sanitizedValue);
        const hasNumbers = /\d/.test(sanitizedValue);
        const hasSpecialChar = /[@$!%*?&]/.test(sanitizedValue);

        if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
        if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
        if (!hasNumbers) errors.push('Password must contain at least one number');
        if (!hasSpecialChar) errors.push('Password must contain at least one special character (@$!%*?&)');
      } else {
        const customResult = rules.custom(sanitizedValue);
        if (typeof customResult === 'string') {
          errors.push(customResult);
        } else if (!customResult) {
          errors.push('Password validation failed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  // Username validation
  validateUsername(username: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = username;

    // Sanitize if requested
    if (rules.sanitize) {
      sanitizedValue = this.sanitizeInput(username);
    }

    // Required check
    if (rules.required && !sanitizedValue) {
      errors.push('Username is required');
      return { isValid: false, errors, sanitizedValue };
    }

    if (sanitizedValue) {
      // Username pattern validation
      const usernamePattern = /^[a-zA-Z0-9_-]+$/;
      if (!usernamePattern.test(sanitizedValue)) {
        errors.push('Username can only contain letters, numbers, underscores, and hyphens');
      }

      // Length validation
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(`Username must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(`Username must be no more than ${rules.maxLength} characters`);
      }

      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(sanitizedValue);
        if (typeof customResult === 'string') {
          errors.push(customResult);
        } else if (!customResult) {
          errors.push('Username validation failed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  // Text content validation
  validateText(text: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = text;

    // Sanitize if requested
    if (rules.sanitize) {
      sanitizedValue = this.sanitizeInput(text);
    }

    // Required check
    if (rules.required && !sanitizedValue) {
      errors.push('Text is required');
      return { isValid: false, errors, sanitizedValue };
    }

    if (sanitizedValue) {
      // Length validation
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(`Text must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(`Text must be no more than ${rules.maxLength} characters`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(sanitizedValue)) {
        errors.push('Text does not match required pattern');
      }

      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(sanitizedValue);
        if (typeof customResult === 'string') {
          errors.push(customResult);
        } else if (!customResult) {
          errors.push('Text validation failed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  // File validation
  validateFile(file: File, rules: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    required?: boolean;
  } = {}): ValidationResult {
    const errors: string[] = [];

    // Required check
    if (rules.required && !file) {
      errors.push('File is required');
      return { isValid: false, errors };
    }

    if (file) {
      // File size validation
      if (rules.maxSize && file.size > rules.maxSize) {
        const maxSizeMB = (rules.maxSize / (1024 * 1024)).toFixed(1);
        errors.push(`File size must be less than ${maxSizeMB}MB`);
      }

      // File type validation
      if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
        errors.push(`File type not allowed. Allowed types: ${rules.allowedTypes.join(', ')}`);
      }

      // Security checks
      if (this.isPotentiallyMalicious(file)) {
        errors.push('File appears to be potentially malicious');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // URL validation
  validateURL(url: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = url;

    // Sanitize if requested
    if (rules.sanitize) {
      sanitizedValue = this.sanitizeInput(url);
    }

    // Required check
    if (rules.required && !sanitizedValue) {
      errors.push('URL is required');
      return { isValid: false, errors, sanitizedValue };
    }

    if (sanitizedValue) {
      try {
        const urlObj = new URL(sanitizedValue);
        
        // Protocol validation
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          errors.push('URL must use HTTP or HTTPS protocol');
        }

        // Length validation
        if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
          errors.push(`URL must be no more than ${rules.maxLength} characters`);
        }

        // Custom validation
        if (rules.custom) {
          const customResult = rules.custom(sanitizedValue);
          if (typeof customResult === 'string') {
            errors.push(customResult);
          } else if (!customResult) {
            errors.push('URL validation failed');
          }
        }
      } catch {
        errors.push('Invalid URL format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  // Phone number validation
  validatePhone(phone: string, rules: ValidationRule = {}): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = phone.replace(/\D/g, ''); // Remove non-digits

    // Required check
    if (rules.required && !sanitizedValue) {
      errors.push('Phone number is required');
      return { isValid: false, errors, sanitizedValue };
    }

    if (sanitizedValue) {
      // Length validation (assuming 10-15 digits for international numbers)
      if (sanitizedValue.length < 10 || sanitizedValue.length > 15) {
        errors.push('Phone number must be between 10 and 15 digits');
      }

      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(sanitizedValue);
        if (typeof customResult === 'string') {
          errors.push(customResult);
        } else if (!customResult) {
          errors.push('Phone number validation failed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue
    };
  }

  // Input sanitization
  private sanitizeInput(input: string): string {
    // Remove potentially dangerous characters and patterns
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .trim();

    // Use DOMPurify for additional sanitization
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });

    return sanitized;
  }

  // Check if file might be malicious
  private isPotentiallyMalicious(file: File): boolean {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileName = file.name.toLowerCase();
    
    // Check for dangerous file extensions
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      return true;
    }

    // Check for double extensions (e.g., file.txt.exe)
    const parts = fileName.split('.');
    if (parts.length > 2) {
      const lastExt = parts[parts.length - 1];
      const secondLastExt = parts[parts.length - 2];
      
      if (dangerousExtensions.includes(`.${lastExt}`) && 
          ['.txt', '.jpg', '.png', '.pdf'].includes(`.${secondLastExt}`)) {
        return true;
      }
    }

    return false;
  }

  // Validate form data
  validateForm(data: Record<string, any>, schema: Record<string, ValidationRule>): {
    isValid: boolean;
    errors: Record<string, string[]>;
    sanitizedData: Record<string, any>;
  } {
    const errors: Record<string, string[]> = {};
    const sanitizedData: Record<string, any> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      let result: ValidationResult;

      // Determine validation type based on field name or rules
      if (field.includes('email')) {
        result = this.validateEmail(value, rules);
      } else if (field.includes('password')) {
        result = this.validatePassword(value, rules);
      } else if (field.includes('username')) {
        result = this.validateUsername(value, rules);
      } else if (field.includes('url')) {
        result = this.validateURL(value, rules);
      } else if (field.includes('phone')) {
        result = this.validatePhone(value, rules);
      } else if (field.includes('file')) {
        result = this.validateFile(value, rules as any);
      } else {
        result = this.validateText(value, rules);
      }

      if (!result.isValid) {
        errors[field] = result.errors;
      }

      if (result.sanitizedValue !== undefined) {
        sanitizedData[field] = result.sanitizedValue;
      } else {
        sanitizedData[field] = value;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    };
  }
}

export const validationService = ValidationService.getInstance();

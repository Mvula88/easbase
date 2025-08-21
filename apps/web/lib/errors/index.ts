export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, true);
  }
}

export class UsageLimitError extends AppError {
  constructor(resource: string) {
    super(`${resource} usage limit exceeded`, 429, true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 503, true, originalError);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(`Database error: ${message}`, 500, false, originalError);
  }
}

export function isOperationalError(error: any): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export function handleError(error: any): {
  statusCode: number;
  message: string;
  details?: any;
} {
  // Log non-operational errors
  if (!isOperationalError(error)) {
    console.error('Non-operational error:', error);
  }

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    };
  }

  // Handle Supabase errors
  if (error?.code === 'PGRST') {
    return {
      statusCode: 400,
      message: 'Database operation failed',
      details: error.message,
    };
  }

  // Handle Stripe errors
  if (error?.type?.includes('Stripe')) {
    return {
      statusCode: 402,
      message: 'Payment processing error',
      details: error.message,
    };
  }

  // Handle Claude/Anthropic errors
  if (error?.status === 429) {
    return {
      statusCode: 503,
      message: 'AI service temporarily unavailable',
    };
  }

  // Default error
  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
  };
}
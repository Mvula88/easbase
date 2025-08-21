import { NextRequest, NextResponse } from 'next/server';
import { handleError, AppError } from '@/lib/errors';

export function withErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      const errorResponse = handleError(error);
      
      // Log error details for monitoring
      console.error('API Error:', {
        url: request.url,
        method: request.method,
        error: errorResponse,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Send error metrics (implement monitoring service)
      // await sendErrorMetrics(error, request);

      return NextResponse.json(
        {
          error: errorResponse.message,
          ...(process.env.NODE_ENV === 'development' && {
            details: errorResponse.details,
            stack: error instanceof Error ? error.stack : undefined,
          }),
        },
        { status: errorResponse.statusCode }
      );
    }
  };
}

export function validateRequest<T>(
  schema: any,
  data: unknown
): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    throw new AppError(
      'Invalid request data',
      400,
      true,
      result.error.errors
    );
  }
  
  return result.data;
}
import type { HttpResponseInit } from '@azure/functions';
import { ApiErrorSchema, type ErrorCode } from '@airme/contracts';

export function jsonResponse(
  status: number,
  jsonBody: unknown,
  headers: Record<string, string>,
): HttpResponseInit {
  return { status, jsonBody, headers };
}

export function errorResponse(input: {
  status: number;
  code: ErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
  headers: Record<string, string>;
}): HttpResponseInit {
  return jsonResponse(
    input.status,
    ApiErrorSchema.parse({
      error: {
        code: input.code,
        message: input.message,
        retryable: input.retryable,
        requestId: input.requestId,
      },
    }),
    input.headers,
  );
}

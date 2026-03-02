import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { winstonLogger } from '../logger/winston.logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let responseMessage: string | string[] = 'Internal server error';
    if (typeof exceptionResponse === 'string') {
      responseMessage = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message?: unknown }).message;
      if (typeof message === 'string' || Array.isArray(message)) {
        responseMessage = message as string | string[];
      }
    }

    let errorMessage = 'Internal server error';
    if (exception instanceof Error) {
      errorMessage = exception.message;
    } else if (typeof responseMessage === 'string') {
      errorMessage = responseMessage;
    } else if (responseMessage.length > 0) {
      errorMessage = responseMessage.join(', ');
    }

    const stack = exception instanceof Error ? exception.stack : undefined;

    winstonLogger.error(errorMessage, stack, 'AllExceptionsFilter');
    winstonLogger.warn({
      status,
      path: request.url,
      method: request.method,
      exception: exceptionResponse,
      timestamp,
      ip: request.ip,
    });

    response.status(status).json({
      statusCode: status,
      message: responseMessage,
      timestamp,
      path: request.url,
    });
  }
}

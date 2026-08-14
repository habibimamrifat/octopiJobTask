import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const error = exception.getResponse();

      message =
        typeof error === 'string'
          ? error
          : (error as { message?: string }).message ?? message;
    } else if (this.isPrismaError(exception)) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          break;

        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;

        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Related record does not exist';
          break;

        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database operation failed';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private isPrismaError(
    exception: unknown,
  ): exception is { code: string } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof exception.code === 'string' &&
      exception.code.startsWith('P')
    );
  }
}
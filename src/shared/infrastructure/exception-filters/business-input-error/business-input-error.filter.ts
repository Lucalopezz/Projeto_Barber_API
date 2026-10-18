import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { ValidationError } from '@/shared/domain/errors/validation-error';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch(BadRequestError, ValidationError)
export class BusinessInputErrorFilter implements ExceptionFilter {
  catch(exception: BadRequestError | ValidationError, host: ArgumentsHost) {
    const statusCode = exception instanceof BadRequestError ? 400 : 422;
    host
      .switchToHttp()
      .getResponse<FastifyReply>()
      .status(statusCode)
      .send({
        statusCode,
        error: statusCode === 400 ? 'Bad Request' : 'Unprocessable Entity',
        message: exception.message,
      });
  }
}

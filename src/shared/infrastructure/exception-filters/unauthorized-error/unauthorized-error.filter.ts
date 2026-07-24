import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch(UnauthorizedError)
export class UnauthorizedErrorFilter implements ExceptionFilter {
  catch(exception: UnauthorizedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    response.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: exception.message,
    });
  }
}

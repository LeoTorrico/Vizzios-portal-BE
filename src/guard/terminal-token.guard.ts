import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';

@Injectable()
export class TerminalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const token = req.headers['x-terminal-token'];

    if (!token) {
      throw new ForbiddenException('Terminal token requerido');
    }

    if (!isUUID(token)) {
      throw new ForbiddenException('Token inválido');
    }

    req.branchId = token;

    return true;
  }
}

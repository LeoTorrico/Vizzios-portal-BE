import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TerminalTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const token = req.headers['x-terminal-token'];

    if (!token) {
      throw new ForbiddenException('Terminal token requerido');
    }

    if (token !== process.env.TERMINAL_TOKEN) {
      throw new ForbiddenException('Terminal no autorizada');
    }

    return true;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../entities/admin-user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepo: Repository<AdminUser>,
  ) {
    // ✅ Validar que JWT_SECRET exista
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET no está definido en las variables de entorno. ' +
          'Asegúrate de tener JWT_SECRET en tu archivo .env',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.adminUserRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no válido');
    }

    return { userId: user.id, username: user.username, role: user.role };
  }
}

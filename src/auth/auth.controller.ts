// src/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Endpoint temporal para crear el primer admin
  // ELIMINAR después de crear tu usuario
  @Post('create-admin')
  createAdmin(@Body() body: { username: string; password: string }) {
    return this.authService.createAdmin(body.username, body.password);
  }
}

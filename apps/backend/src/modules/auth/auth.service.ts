// apps/backend/src/modules/auth/auth.service.ts
// CHANGE: pinLogin now includes terminal_id and location_id in the JWT payload
// so downstream terminal endpoints can read them from req.user without an extra DB query.
//
// Only the pinLogin method changes — everything else stays the same.
// Diff from original:
//   payload now includes: terminal_id, location_id (in addition to existing fields)
//   response.user now includes: business_id (was missing — caused catalog 401)

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../common/entities/user.entity';
import { SuperAdmin } from '../../common/entities/super-admin.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)       private userRepo: Repository<User>,
    @InjectRepository(SuperAdmin) private superAdminRepo: Repository<SuperAdmin>,
    @InjectRepository(Terminal)   private terminalRepo: Repository<Terminal>,
    private jwtService: JwtService,
  ) {}

  // ── Dashboard login (email + password) ──────────────────────────────────
  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email, is_active: true },
      relations: ['business'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.dashboard_access) {
      throw new UnauthorizedException('No dashboard access');
    }

    const payload: JwtPayload = {
      sub        : user.id,
      email      : user.email,
      type       : 'user',
      role       : user.role,
      business_id: user.business_id,
    };

    return {
      access_token : this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id             : user.id,
        email          : user.email,
        first_name     : user.first_name,
        last_name      : user.last_name,
        role           : user.role,
        business_id    : user.business_id,
        business_name  : user.business?.name,
      },
    };
  }

  // ── Super Admin login ────────────────────────────────────────────────────
  async superAdminLogin(email: string, password: string) {
    const admin = await this.superAdminRepo.findOne({ where: { email, is_active: true } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.superAdminRepo.update(admin.id, { last_login_at: new Date() });

    const payload: JwtPayload = { sub: admin.id, email: admin.email, type: 'super_admin' };

    return {
      access_token : this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: { id: admin.id, email: admin.email, name: admin.name, type: 'super_admin' },
    };
  }

  // ── Terminal PIN login ────────────────────────────────────────────────────
  // FIX: payload now includes terminal_id + location_id
  // FIX: response.user now returns business_id (was missing → catalog 401)
  async pinLogin(pin: string, terminalCode: string) {
    const terminal = await this.terminalRepo.findOne({
      where    : { terminal_code: terminalCode, is_active: true },
      relations: ['location', 'location.business'],
    });
    if (!terminal) throw new UnauthorizedException('Terminal not found');

    const businessId = terminal.location.business_id;

    const user = await this.userRepo.findOne({
      where: { pin, business_id: businessId, is_active: true },
    });
    if (!user) throw new UnauthorizedException('Invalid PIN');

    const payload: JwtPayload = {
      sub        : user.id,
      email      : user.email,
      type       : 'user',
      role       : user.role,
      business_id: user.business_id,       // ← required by catalog endpoint
      terminal_id: terminal.id,            // ← new: lets terminal endpoints skip a DB lookup
      location_id: terminal.location_id,   // ← new: needed for transaction creation
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '12h' }),
      user: {
        id         : user.id,
        first_name : user.first_name,
        last_name  : user.last_name,
        role       : user.role,
        business_id: user.business_id,     // ← was missing from original response
        can_void   : user.can_void,
        can_refund : user.can_refund,
      },
      terminal: {
        id           : terminal.id,
        terminal_code: terminal.terminal_code,
        device_name  : terminal.device_name,
      },
    };
  }

  // ── Refresh token ────────────────────────────────────────────────────────
  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const newPayload: JwtPayload = {
        sub        : payload.sub,
        email      : payload.email,
        type       : payload.type,
        role       : payload.role,
        business_id: payload.business_id,
        terminal_id: payload.terminal_id,
        location_id: payload.location_id,
      };
      return { access_token: this.jwtService.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ── Change password ──────────────────────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Password changed successfully' };
  }

  // ── Get profile ──────────────────────────────────────────────────────────
  async getProfile(userId: string, type: string) {
    if (type === 'super_admin') {
      const admin = await this.superAdminRepo.findOne({ where: { id: userId } });
      return { ...admin, password_hash: undefined, type: 'super_admin' };
    }
    const user = await this.userRepo.findOne({
      where    : { id: userId },
      relations: ['business'],
    });
    return { ...user, password_hash: undefined, pin: undefined, type: 'user' };
  }
}
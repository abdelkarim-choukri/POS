import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../common/entities/user.entity';
import { SuperAdmin } from '../../../common/entities/super-admin.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'super_admin' | 'user';
  role?: string;
  business_id?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SuperAdmin) private superAdminRepo: Repository<SuperAdmin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'super_admin') {
      const admin = await this.superAdminRepo.findOne({ where: { id: payload.sub, is_active: true } });
      if (!admin) throw new UnauthorizedException('Invalid token');
      return { id: admin.id, email: admin.email, type: 'super_admin', name: admin.name };
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, is_active: true },
      relations: ['business'],
    });
    if (!user) throw new UnauthorizedException('Invalid token');

    return {
      id: user.id,
      email: user.email,
      type: 'user',
      role: user.role,
      business_id: user.business_id,
      first_name: user.first_name,
      last_name: user.last_name,
      can_void: user.can_void,
      can_refund: user.can_refund,
      dashboard_access: user.dashboard_access,
    };
  }
}

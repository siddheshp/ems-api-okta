import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User information not found. Please ensure authentication guard runs first.');
    }

    const groups = user.groups || [];
    const isAdmin = groups.includes('admin');

    if (!isAdmin) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }

    return true;
  }
}

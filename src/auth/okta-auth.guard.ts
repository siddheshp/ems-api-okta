import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OktaJwtVerifier from '@okta/jwt-verifier';

@Injectable()
export class OktaAuthGuard implements CanActivate {
  private oktaVerifier: OktaJwtVerifier;

  constructor(private configService: ConfigService) {
    const issuer = this.configService.get<string>('OKTA_ISSUER');
    const clientId = this.configService.get<string>('OKTA_CLIENT_ID');

    if (!issuer || !clientId) {
      throw new Error('Okta configuration is missing. Please set OKTA_ISSUER and OKTA_CLIENT_ID in .env file');
    }

    this.oktaVerifier = new OktaJwtVerifier({
      issuer,
      clientId,
      assertClaims: {
        aud: this.configService.get<string>('OKTA_AUDIENCE', 'api://default'),
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header found');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const jwt = await this.oktaVerifier.verifyAccessToken(token, 'api://default');
      
      // Attach user information to request
      request.user = {
        sub: jwt.claims.sub,
        email: jwt.claims.email,
        groups: jwt.claims.groups || [],
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(`Token verification failed: ${error.message}`);
    }
  }
}

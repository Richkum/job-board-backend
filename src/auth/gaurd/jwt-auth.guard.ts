import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, firstValueFrom } from 'rxjs'; // Add firstValueFrom import
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Creates a new instance of the JwtAuthGuard with the given AuthService.
   * The AuthService is used to validate the token and retrieve the user from the database.
   * @param authService The AuthService to use for authentication.
   */
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('JWT Guard - Auth Header:', authHeader ? 'Bearer ...' : 'none');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('JWT Guard - Invalid header format');
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    try {
      const result = await this.validateRequest(context);
      const user = request.user;
      console.log('JWT Guard - User in request:', {
        _id: user?._id,
        id: user?.id,
      });
      return result;
    } catch (error) {
      console.error('JWT Guard - Authentication failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async validateRequest(context: ExecutionContext): Promise<boolean> {
    const result = super.canActivate(context);

    if (result instanceof Observable) {
      return firstValueFrom(result);
    } else if (result instanceof Promise) {
      return result;
    }
    return result;
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('JWT Guard - HandleRequest called with user:', user?._id);
    if (err || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user;
  }
}

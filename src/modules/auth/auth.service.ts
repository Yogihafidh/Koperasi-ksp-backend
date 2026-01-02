import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getAuthHello(): string {
    return 'Hello from Auth Service!';
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ApplicationError } from '../../../common/errors/application.error';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { RequestPasswordOtpDto, ResetPasswordDto, VerifyPasswordOtpDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { TokenPair, TokenService } from '../services/token.service';
import { AuthUser } from '../types/auth-user.type';

const REFRESH_COOKIE = 'aptimate_refresh_token';
const ACCESS_COOKIE = 'aptimate_access_token';
const RESET_COOKIE = 'aptimate_password_reset_token';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService, private readonly tokens: TokenService,
    private readonly passwordReset: PasswordResetService, private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto, this.metadata(request));
    this.setAuthCookies(response, result.tokens);
    return this.authResponse(result.user, result.tokens);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, this.metadata(request));
    this.setAuthCookies(response, result.tokens);
    return this.authResponse(result.user, result.tokens);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const pair = await this.tokens.refresh(this.refreshCookie(request), this.metadata(request));
    this.setAuthCookies(response, pair);
    return { expiresIn: pair.expiresIn };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.tokens.revoke(request.cookies?.[REFRESH_COOKIE] as string | undefined);
    this.clearAuthCookies(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(ACCESS_COOKIE)
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.tokens.revokeAll(user.id);
    this.clearAuthCookies(response);
  }

  @Post('forgot-password/request-otp')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  async requestPasswordOtp(@Body() dto: RequestPasswordOtpDto) {
    await this.passwordReset.request(dto.email);
    return { message: 'If the account exists, a password reset code has been sent.' };
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 8, ttl: 15 * 60_000 } })
  async verifyPasswordOtp(@Body() dto: VerifyPasswordOtpDto, @Res({ passthrough: true }) response: Response) {
    this.setResetCookie(response, await this.passwordReset.verify(dto.email, dto.otp));
    return { message: 'OTP verified.' };
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.passwordReset.reset(this.resetCookie(request), dto.newPassword, dto.confirmPassword);
    this.clearResetCookie(response);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(ACCESS_COOKIE)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.changePassword(user, dto);
    this.clearAuthCookies(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth(ACCESS_COOKIE)
  me(@CurrentUser() user: AuthUser): AuthUser { return user; }

  private metadata(request: Request) {
    return { userAgent: request.get('user-agent'), ipAddress: request.ip };
  }

  private refreshCookie(request: Request): string {
    const token = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new ApplicationError('REFRESH_TOKEN_REQUIRED', 'Refresh token is required.', 401);
    return token;
  }

  private resetCookie(request: Request): string {
    const token = request.cookies?.[RESET_COOKIE] as string | undefined;
    if (!token) throw new ApplicationError('RESET_TOKEN_REQUIRED', 'Verify your OTP before resetting the password.', 401);
    return token;
  }

  private authResponse(user: AuthUser, pair: TokenPair) {
    return { expiresIn: pair.expiresIn, profile: user };
  }

  private setAuthCookies(response: Response, pair: TokenPair): void {
    const apiPath = `/${this.config.get<string>('app.apiPrefix', 'api/v1')}`;
    const sharedOptions = {
      httpOnly: true, secure: this.config.get<string>('app.env') === 'production', sameSite: 'lax',
    } as const;
    response.cookie(ACCESS_COOKIE, pair.accessToken, {
      ...sharedOptions, path: apiPath, maxAge: pair.expiresIn * 1000,
    });
    response.cookie(REFRESH_COOKIE, pair.refreshToken, {
      ...sharedOptions, path: `${apiPath}/auth`,
      maxAge: this.config.get<number>('auth.refreshTtlDays', 7) * 86_400_000,
    });
  }

  private clearAuthCookies(response: Response): void {
    const apiPath = `/${this.config.get<string>('app.apiPrefix', 'api/v1')}`;
    const sharedOptions = {
      httpOnly: true, secure: this.config.get<string>('app.env') === 'production', sameSite: 'lax',
    } as const;
    response.clearCookie(ACCESS_COOKIE, { ...sharedOptions, path: apiPath });
    response.clearCookie(REFRESH_COOKIE, { ...sharedOptions, path: `${apiPath}/auth` });
  }

  private setResetCookie(response: Response, token: string): void {
    response.cookie(RESET_COOKIE, token, {
      httpOnly: true, secure: this.config.get<string>('app.env') === 'production', sameSite: 'strict',
      path: `/${this.config.get<string>('app.apiPrefix', 'api/v1')}/auth/forgot-password`,
      maxAge: this.config.get<number>('auth.resetGrantTtlMinutes', 15) * 60_000,
    });
  }

  private clearResetCookie(response: Response): void {
    response.clearCookie(RESET_COOKIE, {
      httpOnly: true, secure: this.config.get<string>('app.env') === 'production', sameSite: 'strict',
      path: `/${this.config.get<string>('app.apiPrefix', 'api/v1')}/auth/forgot-password`,
    });
  }
}

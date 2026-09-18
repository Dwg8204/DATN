import { IsOptional, IsString, Length, MaxLength, registerDecorator, ValidationOptions } from 'class-validator';
import { getTimeZones } from '@vvo/tzdb';
import { ApiPropertyOptional } from '@nestjs/swagger';

const validTimeZones = new Set(getTimeZones().map(tz => tz.name));

export function IsTimeZone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTimeZone',
      target: object.constructor,
      propertyName: propertyName,
      options: { message: 'timezone must be a valid IANA time zone string', ...validationOptions },
      validator: {
        validate(value: any) {
          return typeof value === 'string' && validTimeZones.has(value);
        },
      },
    });
  };
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John', description: 'Tên của người dùng' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Họ của người dùng' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Tôi là giáo viên tiếng Anh', description: 'Tiểu sử cá nhân' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh', description: 'Múi giờ chuẩn IANA' })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}

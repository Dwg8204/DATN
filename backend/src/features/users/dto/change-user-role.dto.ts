import { Equals } from 'class-validator';

export class ChangeUserRoleDto {
  @Equals('TEACHER', { message: 'Role can only be changed to TEACHER.' })
  role!: 'TEACHER';
}

import { firstMutationRow } from '../../../common/database/mutation-result';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsInt, Min } from 'class-validator';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { placementTests, PLACEMENT_REQUIRED } from '../../ai-shared/placement';
import { ApplicationError } from '../../../common/errors/application.error';
class PlacementDto {
  @IsBoolean() isPlacement!: boolean;
  @IsInt() @Min(1) version!: number;
}
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPlacementController {
  constructor(private readonly db: DataSource) {}
  @Get('placement-tests') async coverage() {
    const tests = await placementTests(this.db.manager);
    return {
      tests,
      missing: PLACEMENT_REQUIRED.filter(
        (skill) => !tests.some((t) => t.skill === skill),
      ),
    };
  }
  @Put('tests/:id/placement') async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlacementDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.db.transaction(async (manager) => {
      const [test] = await manager.query(
        'SELECT id,scope,version,is_placement FROM tests WHERE id=$1 AND archived_at IS NULL FOR UPDATE',
        [id],
      );
      if (!test)
        throw new ApplicationError('TEST_NOT_FOUND', 'Test not found.', 404);
      if (test.version !== dto.version)
        throw new ApplicationError(
          'TEST_VERSION_CONFLICT',
          'Reload this test before changing its placement setting.',
          409,
        );
      if (dto.isPlacement && test.scope !== 'FULL_SKILL')
        throw new ApplicationError(
          'PLACEMENT_FULL_REQUIRED',
          'Placement assessments must be full-skill tests.',
          400,
        );
      const saved = await manager.query(
        'UPDATE tests SET is_placement=$2,version=version+1,updated_by=$3,updated_at=now() WHERE id=$1 RETURNING id,version,is_placement AS "isPlacement"',
        [id, dto.isPlacement, actor.id],
      );
      await manager.query(
        "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes) VALUES($1,'TEST_PLACEMENT_UPDATED','TEST',$2,$3)",
        [actor.id, id, { before: test.is_placement, after: dto.isPlacement }],
      );
      return firstMutationRow<{
        id: string;
        version: number;
        isPlacement: boolean;
      }>(saved);
    });
  }
}

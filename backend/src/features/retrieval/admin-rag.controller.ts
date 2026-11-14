import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/types/auth-user.type";
import { AdminRagService } from "./admin-rag.service";
import { RagGapsDto, ReembedDto } from "./admin-rag.dto";
@Controller("admin/rag")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminRagController {
  constructor(private readonly rag: AdminRagService) {}
  @Get("status") status() {
    return this.rag.status();
  }
  @Get("gaps") gaps(@Query() query: RagGapsDto) {
    return this.rag.gaps(query);
  }
  @Post("reembed") reembed(
    @CurrentUser() actor: AuthUser,
    @Body() body: ReembedDto,
  ) {
    return this.rag.reembed(actor.id, body);
  }
}

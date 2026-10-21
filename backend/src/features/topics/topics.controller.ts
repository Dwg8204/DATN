import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthUser } from "../auth/types/auth-user.type";
import {
  TopicBulkDto,
  TopicApproveTestDto,
  TopicInputDto,
  TopicQueryDto,
  TopicReviewDto,
} from "./topics.dto";
import { TopicsService } from "./topics.service";
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class TopicsController {
  constructor(private readonly topics: TopicsService) {}
  @Get("learning-topics") list(@Query() q: TopicQueryDto) {
    return this.topics.topics(q);
  }
  @Delete("learning-topics/:id") remove(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.topics.remove(actor.id, id);
  }
  @Post("learning-topics") create(
    @CurrentUser() actor: AuthUser,
    @Body() body: TopicInputDto,
  ) {
    return this.topics.save(actor.id, body);
  }
  @Patch("learning-topics/:id") update(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: TopicInputDto,
  ) {
    return this.topics.save(actor.id, body, id);
  }
  @Get("topic-labels/tests") tests(@Query() q: TopicQueryDto) {
    return this.topics.tests(q);
  }
  @Get("topic-labels/progress") progress(@Query() q: TopicQueryDto) {
    return this.topics.progress(q);
  }
  @Post("topic-labels/suggest-missing") suggestMissing(
    @CurrentUser() actor: AuthUser,
    @Body() body: TopicBulkDto,
  ) {
    return this.topics.suggestMissing(actor.id, body);
  }
  @Get("topic-labels") labels(@Query() q: TopicQueryDto) {
    return this.topics.labels(q);
  }
  @Post("topic-labels/review") review(
    @CurrentUser() actor: AuthUser,
    @Body() body: TopicReviewDto,
  ) {
    return this.topics.review(actor.id, body);
  }
  @Post("tests/:id/suggest-topics") suggest(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.topics.suggest(actor.id, id);
  }
  @Get("tests/:id/topic-approval") approvalPreview(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.topics.approvalPreview(id);
  }
  @Post("tests/:id/approve-topics") approveTest(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: TopicApproveTestDto,
  ) {
    return this.topics.approveTest(actor.id, id, body.revision);
  }
}

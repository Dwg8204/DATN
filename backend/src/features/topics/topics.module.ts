import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { AiSharedModule } from "../ai-shared/ai-shared.module";
import { TopicsController } from "./topics.controller";
import { TopicsService } from "./topics.service";
import { TopicsWorker } from "./topics.worker";
@Module({
  imports: [ConfigModule, AuthModule, AiSharedModule],
  controllers: [TopicsController],
  providers: [TopicsService, TopicsWorker],
})
export class TopicsModule {}

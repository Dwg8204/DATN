import "dotenv/config";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DatabaseModule } from "../src/database/database.module";
import configuration from "../src/config/configuration";
import { PersonalizationModule } from "../src/features/personalization/personalization.module";
import { PlanService } from "../src/features/personalization/services/plan.service";
// No HTTP server or scheduler is started by this CLI.
process.env.PERSONALIZATION_WORKER_ENABLED = "false";
process.env.ATTEMPT_EXPIRY_WORKER_ENABLED = "false";
process.env.PERSONALIZATION_AI_ENABLED = "false";
process.env.SPEAKING_AI_ENABLED = "false";
process.env.WRITING_AI_ENABLED = "false";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    PersonalizationModule,
  ],
})
class ReplanModule {}
async function main() {
  const app = await NestFactory.createApplicationContext(ReplanModule, {
    logger: ["error"],
  });
  try {
    console.log(
      JSON.stringify({
        mode: process.argv.includes("--apply") ? "apply" : "dry-run",
        ...(await app
          .get(PlanService)
          .replanCurrent(process.argv.includes("--apply"))),
      }),
    );
  } finally {
    await app.close();
  }
}
main().catch(() => {
  console.error("Replan failed; check database configuration.");
  process.exitCode = 1;
});

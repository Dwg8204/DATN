import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TestAttemptsModule } from '../test-attempts/test-attempts.module';
import { DictionaryModule } from '../dictionary/dictionary.module';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotRepository } from './chatbot.repository';
import { ChatbotProvider } from './chatbot.provider';
import { ChatbotContext } from './chatbot.context';
import { ChatbotKnowledge } from './chatbot.knowledge';
@Module({imports:[AuthModule,TestAttemptsModule,DictionaryModule],controllers:[ChatbotController],providers:[ChatbotService,ChatbotRepository,ChatbotProvider,ChatbotContext,ChatbotKnowledge]})
export class ChatbotModule {}

import { Body,Controller,Delete,Get,Param,ParseUUIDPipe,Patch,Post,Query,UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { ChatbotService } from './chatbot.service';
import { ChatPageDto,CreateChatDto,FeedbackDto,RenameChatDto,SendChatDto } from './chatbot.dto';

@Controller('chatbot') @UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chat:ChatbotService) {}
  @Get('status') status(){return {data:this.chat.status};}
  @Get('sessions') async sessions(@CurrentUser() a:AuthUser,@Query() q:ChatPageDto){return {data:await this.chat.repo.sessions(a.id,q.page)};}
  @Post('sessions') @Throttle({default:{limit:10,ttl:60000}})
  async create(@CurrentUser() a:AuthUser,@Body() dto:CreateChatDto){return {data:await this.chat.create(a,dto)};}
  @Patch('sessions/:id') async rename(@CurrentUser() a:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Body() dto:RenameChatDto){return {data:await this.chat.repo.rename(a.id,id,dto.title)};}
  @Delete('sessions/:id') async remove(@CurrentUser() a:AuthUser,@Param('id',ParseUUIDPipe) id:string){return {data:await this.chat.repo.remove(a.id,id)};}
  @Get('sessions/:id/messages') async messages(@CurrentUser() a:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Query() q:ChatPageDto){return {data:await this.chat.repo.messages(a.id,id,q.page)};}
  @Post('sessions/:id/messages') @Throttle({default:{limit:10,ttl:60000}})
  async send(@CurrentUser() a:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Body() dto:SendChatDto){return {data:await this.chat.send(a,id,dto)};}
  @Post('sessions/:id/messages/:messageId/retry') @Throttle({default:{limit:5,ttl:60000}})
  async retry(@CurrentUser() a:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Param('messageId',ParseUUIDPipe) messageId:string){return {data:await this.chat.retry(a,id,messageId)};}
  @Patch('sessions/:id/messages/:messageId/feedback') async feedback(@CurrentUser() a:AuthUser,@Param('id',ParseUUIDPipe) id:string,@Param('messageId',ParseUUIDPipe) messageId:string,@Body() dto:FeedbackDto){return {data:await this.chat.repo.feedback(a.id,id,messageId,dto.feedback)};}
}

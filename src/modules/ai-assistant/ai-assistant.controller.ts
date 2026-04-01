import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsOptional, IsUUID } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { AiAssistantService } from './ai-assistant.service'

class ChatDto {
  @IsString()
  message: string

  @IsOptional()
  @IsUUID()
  emergencyId?: string
}

@ApiTags('AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat con asistente médico IA (Claude)' })
  chat(@CurrentUser() user: User, @Body() dto: ChatDto) {
    return this.aiAssistantService.chat(user.id, dto.message, dto.emergencyId)
  }
}

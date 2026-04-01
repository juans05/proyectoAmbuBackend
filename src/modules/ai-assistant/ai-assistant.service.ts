import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { UsersService } from '../users/users.service'

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name)

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
  ) {}

  async chat(userId: string, message: string, emergencyId?: string): Promise<{ reply: string }> {
    const user = await this.usersService.findById(userId)

    const systemPrompt = `Eres un asistente médico de emergencias de AmbuGo, una plataforma de despacho de ambulancias en Lima, Perú.
Ayudas a los usuarios durante emergencias médicas. Habla en español peruano, de forma clara y tranquilizadora.
Información del paciente:
- Nombre: ${user?.name ?? 'Desconocido'}
- Tipo de sangre: ${user?.bloodType ?? 'No registrado'}
- Alergias: ${user?.allergies ?? 'Ninguna registrada'}
- Condiciones crónicas: ${user?.chronicConditions ?? 'Ninguna registrada'}
${emergencyId ? `- ID de emergencia activa: ${emergencyId}` : ''}

IMPORTANTE: No reemplazas atención médica profesional. Tu rol es orientar mientras llega la ambulancia.`

    const apiKey = this.config.get<string>('CLAUDE_API_KEY')
    const model = this.config.get<string>('CLAUDE_MODEL') ?? 'claude-sonnet-4-6'

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.anthropic.com/v1/messages',
          {
            model,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
          },
        ),
      )
      const reply = response.data?.content?.[0]?.text ?? 'No pude procesar tu consulta.'
      return { reply }
    } catch (error) {
      this.logger.error('Claude API error', error)
      return { reply: 'El asistente no está disponible en este momento. La ambulancia está en camino.' }
    }
  }
}

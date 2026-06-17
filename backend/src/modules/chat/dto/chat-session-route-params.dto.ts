import { IsUUID } from 'class-validator';
import { BusinessSlugParamDto } from '../../business-profile/dto/business-slug-param.dto';

export class ChatSessionRouteParamsDto extends BusinessSlugParamDto {
  @IsUUID('4')
  sessionId!: string;
}

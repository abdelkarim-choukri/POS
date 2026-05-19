import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { RecommendationTerminalController } from './recommendation-terminal.controller';
import { RecommendationTemplate } from '../../common/entities/recommendation-template.entity';
import { RecommendationTemplateItem } from '../../common/entities/recommendation-template-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecommendationTemplate, RecommendationTemplateItem])],
  controllers: [RecommendationController, RecommendationTerminalController],
  providers: [RecommendationService],
})
export class RecommendationModule {}

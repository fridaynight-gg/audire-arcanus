import { Module, forwardRef } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { LobbyGateway } from './lobby.gateway';
import { StatsModule } from '../stats/stats.module';
import { StreamingModule } from '../streaming/streaming.module';

@Module({
  imports: [StatsModule, forwardRef(() => StreamingModule)],
  controllers: [LobbyController],
  providers: [LobbyService, LobbyGateway],
  exports: [LobbyService, LobbyGateway],
})
export class LobbyModule {}

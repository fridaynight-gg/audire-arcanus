import { Module, forwardRef } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingGateway } from './streaming.gateway';
import { StreamingController } from './streaming.controller';
import { AudioModule } from '../audio/audio.module';
import { StatsModule } from '../stats/stats.module';
import { LobbyModule } from '../lobby/lobby.module';

@Module({
  imports: [AudioModule, StatsModule, forwardRef(() => LobbyModule)],
  controllers: [StreamingController],
  providers: [StreamingService, StreamingGateway],
  exports: [StreamingService, StreamingGateway],
})
export class StreamingModule {}

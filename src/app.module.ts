import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioModule } from './audio/audio.module';
import { LobbyModule } from './lobby/lobby.module';
import { StreamingModule } from './streaming/streaming.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      // In production (packaged), __dirname is inside dist-electron/src
      // In development, __dirname is inside dist/src
      // Both need to go up to root and find client/
      rootPath: join(__dirname, '..', '..', 'client'),
      serveRoot: '/',
    }),
    AudioModule,
    LobbyModule,
    StreamingModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { AudioCaptureFactory } from './capture/audio-capture.factory';

@Module({
  controllers: [AudioController],
  providers: [AudioService, AudioCaptureFactory],
  exports: [AudioService],
})
export class AudioModule {}

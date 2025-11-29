import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AudioService } from './audio.service';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('sources')
  async getSources() {
    return await this.audioService.getAvailableSources();
  }

  @Get('active')
  getActiveSource() {
    return this.audioService.getActiveSource();
  }

  @Get('platform')
  getPlatform() {
    return {
      platform: this.audioService.getPlatform(),
      nodejs: process.version,
    };
  }

  @Post('select')
  async selectSource(@Body('sourceId') sourceId: string) {
    if (!sourceId) {
      throw new HttpException('Source ID required', HttpStatus.BAD_REQUEST);
    }

    const success = await this.audioService.selectSource(sourceId);
    if (!success) {
      throw new HttpException('Source not found', HttpStatus.NOT_FOUND);
    }

    return { success: true, source: this.audioService.getActiveSource() };
  }

  @Post('stop')
  async stopCapture() {
    await this.audioService.stopCapture();
    return { success: true };
  }
}

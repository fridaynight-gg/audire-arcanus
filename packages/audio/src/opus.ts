import { Application, createEncoder } from "libopus-wasm";

export const createOpusEncoder = () =>
  createEncoder({
    sampleRate: 48000,
    channels: 2,
    application: Application.Audio,
    bitrate: 160000,
  });

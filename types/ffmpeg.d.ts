declare module '@ffmpeg/ffmpeg' {
  export function createFFmpeg(options: any): any;
  export function fetchFile(file: any): Promise<Uint8Array>;
}
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const storage = new Storage();

const speakerVoiceMap: { [key: string]: string } = {
  "Keith": process.env.ELEVENLABS_VOICE_ID_KEITH || '',
  "Humza": process.env.ELEVENLABS_VOICE_ID_HUMZA || ''
};

const elevenlabsUrl = 'https://api.elevenlabs.io/v1/text-to-speech';
const elevenlabsHeaders = {
  'xi-api-key': process.env.ELEVENLABS_API_KEY,
  'Content-Type': 'application/json'
};

export async function synthesizeSpeechElevenlabs(text: string, speaker: string, index: number): Promise<string> {
  const voiceId = speakerVoiceMap[speaker];
  console.log(`Synthesizing speech for ${speaker} using ElevenLabs (Voice ID: ${voiceId})`);
  console.log(`Text to synthesize: "${text}"`);
  
  if (!voiceId) {
    throw new Error(`No voice ID found for speaker: ${speaker}. Available speakers: ${Object.keys(speakerVoiceMap).join(', ')}`);
  }

  const data = {
    text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  };

  try {
    const response = await axios.post(`${elevenlabsUrl}/${voiceId}`, data, { headers: elevenlabsHeaders, responseType: 'arraybuffer' });
    const fileName = `${index}_${speaker}.mp3`;
    const filePath = path.join(process.cwd(), 'public', 'audio-files', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, response.data);
    console.log(`Audio content written to file "${filePath}"`);
    
    return fileName;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('ElevenLabs API Error:', error.response?.data.toString());
      throw new Error(`ElevenLabs API Error: ${error.response?.status} ${error.response?.statusText}`);
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }
}

export async function uploadToGoogleCloudStorage(fileName: string): Promise<string> {
  const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET environment variable is not set');
  }
  const filePath = path.join(process.cwd(), 'public', 'audio-files', fileName);
  
  try {
    const uniqueFileName = `${Date.now()}_${fileName}`;
    console.log(`Attempting to upload ${fileName} as ${uniqueFileName} to bucket ${bucketName}`);
    
    const [file] = await storage.bucket(bucketName).upload(filePath, {
      destination: uniqueFileName,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        contentType: 'audio/mpeg',
      },
    });

    console.log(`File ${uniqueFileName} uploaded successfully.`);
    console.log('File metadata:', file.metadata);

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;
    console.log(`Public URL generated: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Google Cloud Storage:', error);
    throw error;
  }
}

export async function concatenateAudioFiles(audioFiles: string[]): Promise<string> {
  const outputFileName = `merged_${Date.now()}.mp3`;
  const outputPath = path.join(process.cwd(), 'public', 'audio-files', outputFileName);

  try {
    const outputStream = createWriteStream(outputPath);
    for (const file of audioFiles) {
      const filePath = path.join(process.cwd(), 'public', 'audio-files', file);
      const fileBuffer = await fs.readFile(filePath);
      console.log(`Read file ${file}, size: ${fileBuffer.length} bytes`);
      
      // Add file content to output
      await pipeline(Readable.from(fileBuffer), outputStream, { end: false });
      
      // Add a short silence (0.5 seconds) between files
      const silenceBuffer = Buffer.alloc(22050); // 0.5 seconds of silence at 44.1kHz
      await pipeline(Readable.from(silenceBuffer), outputStream, { end: false });
    }
    outputStream.end();

    console.log(`Concatenated audio saved to ${outputPath}`);
    return outputFileName;
  } catch (error) {
    console.error('Error in concatenateAudioFiles:', error);
    throw error;
  }
}
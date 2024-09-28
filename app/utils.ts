import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';

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
    
    // Upload directly to Google Cloud Storage
    await uploadToGoogleCloudStorage(fileName, response.data);
    console.log(`Audio content uploaded to Google Cloud Storage: ${fileName}`);
    
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

export async function uploadToGoogleCloudStorage(fileName: string, data: Buffer): Promise<string> {
  const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET environment variable is not set');
  }
  
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    await new Promise((resolve, reject) => {
      const stream = Readable.from(data);
      stream
        .pipe(file.createWriteStream({
          metadata: {
            contentType: 'audio/mpeg',
          },
        }))
        .on('error', reject)
        .on('finish', resolve);
    });

    console.log(`File ${fileName} uploaded successfully.`);

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    console.log(`Public URL generated: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Google Cloud Storage:', error);
    throw error;
  }
}

export async function concatenateAudioFiles(audioFiles: string[]): Promise<string> {
  // This function needs to be implemented using Google Cloud Storage APIs
  // For now, we'll just return the first file as a placeholder
  console.log('Concatenation not implemented yet. Returning first file.');
  return audioFiles[0];
}
import { NextResponse } from 'next/server';
import { synthesizeSpeechElevenlabs, uploadToGoogleCloudStorage, concatenateAudioFiles } from '../../utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in the environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const system_prompt = `You are an experienced podcast host...

- Based on text like an article, you can create an engaging conversation between two people.
- Make the conversation at least 30,000 characters long with a lot of emotion.
- In the response, for me to identify, use Keith: and Humza: at the beginning of each speaker's part.
- Keith is writing the articles, and Humza is the second speaker who asks all the good questions.
- The podcast is called The Machine Learning Engineer.
- Use short sentences that can be easily used with speech synthesis.
- Include excitement during the conversation.
- Do not mention last names.
- Keith and Humza are doing this podcast together. Avoid sentences like: "Thanks for having me, Humza!"
- Include filler words like "uh" or repeat words to make the conversation more natural.
- IMPORTANT: Always start the conversation with Keith introducing the topic.
- Do not use any special formatting like asterisks or line breaks within the speech parts.
- Do not include the speaker names in the actual speech content.`;

export async function POST(req: Request) {
  try {
    console.log('Received request to generate podcast');
    const { article } = await req.json();
    console.log('Article received:', article);

    // Generate conversation using Google AI
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent([
      system_prompt,
      `Generate a podcast conversation based on this article: ${article}`
    ]);
    const generatedConversation = result.response.text();
    console.log('Generated conversation:', generatedConversation);
    console.log('Generated conversation length:', generatedConversation.length);

    // Split the conversation into parts
    const conversationParts = generatedConversation.split(/\n(?=Humza:|Keith:)/);
    console.log('Number of conversation parts:', conversationParts.length);
    console.log('Conversation parts:', JSON.stringify(conversationParts, null, 2));

    const audioFiles = [];
    for (let i = 0; i < conversationParts.length; i++) {
      const part = conversationParts[i];
      console.log(`Processing part ${i}:`, part);
      const match = part.match(/^(Humza|Keith):\s*([\s\S]*)/);
      if (!match) {
        console.log(`Invalid part ${i}:`, part);
        continue;
      }

      const [, speaker, text] = match;
      
      // Remove any remaining asterisks or excessive whitespace
      const cleanedText = text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
      
      if (!cleanedText) {
        console.log(`Empty part ${i} for ${speaker}`);
        continue; // Skip empty parts
      }
      
      console.log(`Processing part ${i} for speaker ${speaker} (${cleanedText.length} characters)`);
      
      try {
        console.log(`Using ElevenLabs voice synthesis for ${speaker}`);
        const fileName = await synthesizeSpeechElevenlabs(cleanedText, speaker, i);
        console.log(`Voice synthesis completed for ${speaker}, file: ${fileName}`);
        audioFiles.push(fileName);
        console.log(`Successfully processed part ${i}`);
      } catch (error) {
        console.error(`Error processing part ${i}:`, error);
        return NextResponse.json({ error: 'Error generating audio', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
      }
    }

    console.log('All audio files generated:', audioFiles);

    if (audioFiles.length === 0) {
      console.error('No audio files were generated');
      return NextResponse.json({ error: 'No audio files were generated' }, { status: 500 });
    }

    console.log('Concatenating audio files...');
    let mergedFileName;
    try {
      mergedFileName = await concatenateAudioFiles(audioFiles);
      console.log('Merged file name:', mergedFileName);
    } catch (error) {
      console.error('Error concatenating audio files:', error);
      return NextResponse.json({ error: 'Error concatenating audio files', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    console.log('Uploading to Google Cloud Storage...');
    let publicUrl;
    try {
      publicUrl = await uploadToGoogleCloudStorage(mergedFileName);
      console.log('Public URL:', publicUrl);
    } catch (error) {
      console.error('Error uploading to Google Cloud Storage:', error);
      return NextResponse.json({ error: 'Error uploading podcast', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    // Verify the file exists and is accessible
    try {
      const response = await fetch(publicUrl);
      if (!response.ok) {
        console.error(`Failed to fetch the audio file. Status: ${response.status}, StatusText: ${response.statusText}`);
        console.error('Response headers:', response.headers);
        throw new Error(`Failed to fetch the audio file: ${response.statusText}`);
      }
      const contentType = response.headers.get('content-type');
      console.log('Content-Type of the audio file:', contentType);
    } catch (error) {
      console.error('Error verifying the audio file:', error);
      return NextResponse.json({ error: 'Error verifying podcast', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    return NextResponse.json({ podcastUrl: publicUrl });
  } catch (error) {
    console.error('Error in generate-podcast:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
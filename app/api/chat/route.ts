// app/api/chat/route.ts
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { NextRequest, NextResponse } from 'next/server';

const bedrockRuntimeClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  }
});

function cleanResponse(text: string) {
  return text
    .replace(/"instruction":"[^"]*","result":/, '')
    .replace(/^{?"|"}?$/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

async function processStream(messageStream: any) {
  try {
    const stream = messageStream.options?.messageStream;
    if (!stream) {
      console.error('No valid message stream found');
      return null;
    }

    for await (const chunk of stream) {
      if (chunk.body) {
        try {
          const decoder = new TextDecoder();
          const decodedData = decoder.decode(chunk.body);
          console.log('Raw decoded data:', decodedData); // Debug log

          const parsedData = JSON.parse(decodedData);
          console.log('Parsed data:', parsedData); // Debug log

          if (parsedData.bytes) {
            try {
              const decodedText = Buffer.from(parsedData.bytes, 'base64').toString('utf-8');
              console.log('Decoded base64 text:', decodedText); // Debug log

              // Handle the case where decodedText might already be the response
              try {
                const jsonResponse = JSON.parse(decodedText);
                if (jsonResponse.result) {
                  return cleanResponse(jsonResponse.result);
                }
              } catch (jsonError) {
                // If parsing fails, the decodedText might be the direct response
                return cleanResponse(decodedText);
              }
            } catch (base64Error) {
              console.error('Base64 decoding error:', base64Error);
              // Try to use the raw decoded data if base64 decoding fails
              return cleanResponse(decodedData);
            }
          } else if (parsedData.result) {
            // Handle case where response might be directly in parsedData
            return cleanResponse(parsedData.result);
          } else if (typeof parsedData === 'string') {
            // Handle case where the response might be a direct string
            return cleanResponse(parsedData);
          }
        } catch (chunkError) {
          console.error('Chunk processing error:', chunkError);
          console.error('Raw chunk data:', chunk.body);
          // Try to decode and return the raw chunk as a fallback
          try {
            const rawText = new TextDecoder().decode(chunk.body);
            return cleanResponse(rawText);
          } catch (decodeError) {
            console.error('Raw decode error:', decodeError);
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Stream processing error:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    const command = new InvokeAgentCommand({
      agentId: process.env.AGENT_ID,
      agentAliasId: process.env.AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: message.trim()
    });

    const response = await bedrockRuntimeClient.send(command);
    console.log('Raw Bedrock response:', response); // Debug log

    let responseText = null;

    if (response.completion) {
      console.log('Completion type:', typeof response.completion); // Debug log
      console.log('Completion content:', response.completion); // Debug log

      if (typeof response.completion === 'string') {
        responseText = cleanResponse(response.completion);
      } else {
        responseText = await processStream(response.completion);
      }
    }

    if (!responseText) {
      console.log('No response text generated'); // Debug log
      return NextResponse.json({ error: "Couldn't generate a response" }, { status: 400 });
    }

    return NextResponse.json({ response: responseText.trim() });
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
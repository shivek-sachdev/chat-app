// app/api/chat/route.ts
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { NextRequest, NextResponse } from 'next/server';

type StreamResponse = {
  options?: {
    messageStream: AsyncIterable<{
      body?: Uint8Array;
    }>;
  };
};

const bedrockRuntimeClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  }
});

function cleanResponse(text: string): string {
  return text
    .replace(/"instruction":"[^"]*","result":/, '')
    .replace(/^{?"|"}?$/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

async function processStream(messageStream: StreamResponse): Promise<string | null> {
  try {
    const stream = messageStream.options?.messageStream;
    if (!stream) return null;

    for await (const chunk of stream) {
      if (chunk.body) {
        const decoder = new TextDecoder();
        const decodedData = decoder.decode(chunk.body);
        const parsedData = JSON.parse(decodedData) as { bytes?: string };
        
        if (parsedData.bytes) {
          const decodedText = Buffer.from(parsedData.bytes, 'base64').toString('utf-8');
          try {
            const jsonResponse = JSON.parse(decodedText) as { result?: string };
            if (jsonResponse.result) {
              return cleanResponse(jsonResponse.result);
            }
          } catch {
            return cleanResponse(decodedText);
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
    const { message, sessionId } = await req.json() as { message: string; sessionId: string };

    const command = new InvokeAgentCommand({
      agentId: process.env.AGENT_ID,
      agentAliasId: process.env.AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: message.trim()
    });

    const response = await bedrockRuntimeClient.send(command);
    let responseText: string | null = null;

    if (response.completion) {
      if (typeof response.completion === 'string') {
        responseText = cleanResponse(response.completion);
      } else {
        responseText = await processStream(response.completion as StreamResponse);
      }
    }

    if (!responseText) {
      return NextResponse.json({ error: "Couldn't generate a response" }, { status: 400 });
    }

    return NextResponse.json({ response: responseText.trim() });
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
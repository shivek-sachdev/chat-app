// app/api/chat/route.ts
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { NextRequest, NextResponse } from 'next/server';

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
};

const bedrockRuntimeClient = new BedrockAgentRuntimeClient(awsConfig);

function cleanResponse(text: string): string {
  text = text.replace(/"instruction":"[^"]*","result":/, '');
  text = text.replace(/^{?"|"}?$/g, '');
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\\\\/g, '\\');
  return text;
}

async function processStream(messageStream: any): Promise<string | null> {
  try {
    const stream = messageStream.options?.messageStream;
    if (!stream) {
      console.error('No valid message stream found');
      return null;
    }

    for await (const chunk of stream) {
      if (chunk.body) {
        const decoder = new TextDecoder();
        const decodedData = decoder.decode(chunk.body);

        try {
          const parsedData = JSON.parse(decodedData);
          if (parsedData.bytes) {
            const decodedText = Buffer.from(parsedData.bytes, 'base64').toString('utf-8');
            try {
              const jsonResponse = JSON.parse(decodedText);
              if (jsonResponse.result) {
                let result = cleanResponse(jsonResponse.result);
                // Fixed regular expression
                if (result.match(/^\d+\./m)) {
                  return result.split(/(?=\d+\.)/)  // Split on numbers followed by dots
                    .map(item => item.trim())
                    .filter(Boolean)
                    .join('\n\n');
                }
                return result;
              }
            } catch (jsonError) {
              return cleanResponse(decodedText);
            }
          }
        } catch (e) {
          console.error('Error processing chunk:', e);
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error in stream processing:', error);
    return null;
  }
}

export interface ChatRequest {
  message: string;
  sessionId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json() as ChatRequest;

    const input = {
      agentId: process.env.AGENT_ID,
      agentAliasId: process.env.AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: message.trim()
    };

    const command = new InvokeAgentCommand(input);
    const response = await bedrockRuntimeClient.send(command);

    let responseText: string | null = null;
    
    if (response.completion) {
      if (typeof response.completion === 'string') {
        responseText = cleanResponse(response.completion);
      } else if (response.completion instanceof Object) {
        responseText = await processStream(response.completion);
      }
    }

    if (!responseText || !responseText.trim()) {
      return NextResponse.json({ error: "Couldn't generate a meaningful response" }, { status: 400 });
    }

    return NextResponse.json({ response: responseText.trim() });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json({ error: "An error occurred while processing your message" }, { status: 500 });
  }
}
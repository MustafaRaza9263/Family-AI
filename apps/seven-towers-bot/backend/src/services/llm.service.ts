import OpenAI from 'openai';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';
import type {
  LlmClient,
  LlmStreamChunk,
  StreamChatParams,
} from '../types/llm';

/** vLLM-specific extra field; intersected so we stay typed without `any`. */
type VllmChatParams = OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
  chat_template_kwargs?: { enable_thinking: boolean };
};

export function createLlmClient(): LlmClient {
  const client = new OpenAI({
    baseURL: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY,
    timeout: env.LLM_TIMEOUT_MS,
  });

  return {
    async ping(): Promise<void> {
      await client.models.list();
    },

    async *streamChat(params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
      const timeout = AbortSignal.timeout(env.LLM_TIMEOUT_MS);
      const signal = AbortSignal.any([params.signal, timeout]);

      let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      try {
        const request: VllmChatParams = {
          model: env.LLM_MODEL,
          messages: params.messages as OpenAI.Chat.ChatCompletionMessageParam[],
          tools: params.tools as OpenAI.Chat.ChatCompletionTool[],
          stream: true,
          stream_options: { include_usage: true },
          temperature: 0.2,
          max_tokens: params.maxTokens,
          chat_template_kwargs: { enable_thinking: false },
        };
        if (params.toolChoice) {
          request.tool_choice =
            params.toolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption;
        }
        stream = await client.chat.completions.create(request, { signal });
      } catch (err) {
        if (signal.aborted) {
          throw err;
        }
        throw new AppError(503, ErrorCodes.LLM_UNAVAILABLE, 'LLM is unavailable');
      }

      try {
        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (choice?.delta) {
            const delta = choice.delta;
            // Ignore reasoning / thinking fields if the model emits them.
            if (typeof delta.content === 'string' && delta.content.length > 0) {
              yield { type: 'token', text: delta.content };
            }
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                yield {
                  type: 'tool_call_delta',
                  index: tc.index,
                  id: tc.id,
                  name: tc.function?.name,
                  argumentsDelta: tc.function?.arguments,
                };
              }
            }
          }

          if (choice?.finish_reason) {
            yield {
              type: 'finish',
              reason: choice.finish_reason,
              usage: chunk.usage
                ? {
                    promptTokens: chunk.usage.prompt_tokens ?? 0,
                    completionTokens: chunk.usage.completion_tokens ?? 0,
                  }
                : undefined,
            };
          } else if (chunk.usage) {
            yield {
              type: 'finish',
              reason: 'stop',
              usage: {
                promptTokens: chunk.usage.prompt_tokens ?? 0,
                completionTokens: chunk.usage.completion_tokens ?? 0,
              },
            };
          }
        }
      } catch (err) {
        if (signal.aborted) {
          throw err;
        }
        throw new AppError(503, ErrorCodes.LLM_UNAVAILABLE, 'LLM is unavailable');
      }
    },
  };
}

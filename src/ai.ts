import type { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from './types'

export type AIConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * 调用 OpenAI 格式的 AI API
 */
export async function chatCompletion(
  config: AIConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const { apiKey, baseUrl, model } = config

  const requestBody: ChatCompletionRequest = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2000,
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as ChatCompletionResponse

  if (!data.choices || data.choices.length === 0) {
    throw new Error('AI API returned no choices')
  }

  return data.choices[0].message.content
}

/**
 * 从 AI 响应中提取 JSON 内容
 * 处理可能的 markdown 代码块包裹
 */
export function extractJson(content: string): string {
  // 移除可能的 markdown 代码块
  let json = content.trim()

  // 处理 ```json ... ``` 格式
  const jsonBlockMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    json = jsonBlockMatch[1].trim()
  }

  return json
}

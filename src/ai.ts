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
 * 从 AI 响应中提取 YAML 内容
 * 处理可能的 markdown 代码块包裹
 */
export function extractYaml(content: string): string {
  // 移除可能的 markdown 代码块
  let yaml = content.trim()

  // 处理 ```yaml ... ``` 格式
  const yamlBlockMatch = yaml.match(/```(?:yaml|yml)?\s*([\s\S]*?)```/)
  if (yamlBlockMatch) {
    yaml = yamlBlockMatch[1].trim()
  }

  return yaml
}

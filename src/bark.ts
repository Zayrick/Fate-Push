import yaml from 'js-yaml'
import type { BarkRequest, DailyFortuneYaml, PushNotification } from './types'

export type BarkConfig = {
  serverUrl: string // e.g., https://api.day.app
  deviceKey: string
}

/**
 * 将 AI 输出的 YAML 转换为推送格式
 */
export function formatToPush(yamlStr: string): PushNotification {
  const data = yaml.load(yamlStr) as DailyFortuneYaml

  // title: 主题
  // 固定标题前缀
  const title = `今日运势·${data.theme}`

  // subtitle: 日期 + 干支 + 评分
  const subtitle = `${data.date} ${data.ganZhi} | 运势 ${data.luck}/10`

  // markdown: 完整内容（严肃风格，无emoji，无分割线）
  const markdown = `**综合分析**  
  
${data.summary}  

**事业**: ${data.career}  

**财运**: ${data.wealth}  

**人际**: ${data.relationship}  

**健康**: ${data.health}  

${data.advice}  

幸运色: ${data.luckyColor} | 方位: ${data.luckyDirection} | 数字: ${data.luckyNumber}`

  return { title, subtitle, markdown }
}

/**
 * 发送 Bark 推送
 */
export async function sendBarkNotification(
  config: BarkConfig,
  notification: PushNotification,
  options?: {
    group?: string
    icon?: string
    sound?: string
  }
): Promise<boolean> {
  const { serverUrl, deviceKey } = config
  const { title, subtitle, markdown } = notification

  const requestBody: BarkRequest = {
    title,
    subtitle,
    markdown,
    device_key: deviceKey,
    group: options?.group || '每日运势',
    icon: options?.icon,
    sound: options?.sound,
    level: 'active',
    isArchive: 1,
  }

  const response = await fetch(`${serverUrl}/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Bark push failed: ${response.status} - ${errorText}`)
  }

  return true
}

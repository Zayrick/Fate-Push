import { buildDailyFortuneData } from './fortune'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts'
import { chatCompletion, extractYaml, type AIConfig } from './ai'
import { formatToPush, sendBarkNotification, type BarkConfig } from './bark'
import type { UserProfile } from './types'

/**
 * 环境变量类型扩展
 */
interface Env {
  // AI 配置
  AI_API_KEY: string
  AI_BASE_URL: string // e.g., https://api.openai.com/v1
  AI_MODEL: string // e.g., gpt-4o

  // Bark 配置
  BARK_SERVER_URL: string // e.g., https://api.day.app
  BARK_DEVICE_KEY: string

  // 命主配置 (JSON 字符串)
  USER_PROFILE: string // {"gender":"male","birthDate":"1990-01-01","birthTime":"12:00"}
}

function parseUserProfile(json: string): UserProfile {
  const raw = JSON.parse(json) as Partial<Record<string, unknown>>
  return {
    gender: (raw.gender as UserProfile['gender']) ?? 'male',
    birthDate: String(raw.birthDate ?? ''),
    birthTime: String(raw.birthTime ?? ''),
  }
}

/**
 * 获取今天的日期 (UTC+8)
 */
function getTodayDate(): string {
  const now = new Date()
  // 转换为北京时间
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return utc8.toISOString().split('T')[0]
}

/**
 * 执行每日运势推送
 */
async function executeDailyFortune(env: Env): Promise<{ success: boolean; message: string }> {
  try {
    // 解析用户配置
    const userProfile = parseUserProfile(env.USER_PROFILE)

    // 获取今天日期
    const targetDate = getTodayDate()

    console.log(`[DailyFortune] 开始计算命主的 ${targetDate} 运势`)

    // 1. 计算命理数据
    const fortuneData = buildDailyFortuneData({
      ...userProfile,
      targetDate,
    })

    console.log(`[DailyFortune] 八字: ${fortuneData.bazi.join(' ')}, 流日: ${fortuneData.liuRi}`)

    // 2. 调用 AI 获取运势分析
    const aiConfig: AIConfig = {
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_BASE_URL,
      model: env.AI_MODEL,
    }

    const aiResponse = await chatCompletion(aiConfig, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(fortuneData) },
    ])

    // 3. 提取 YAML 并转换为推送格式
    const yamlContent = extractYaml(aiResponse)
    const notification = formatToPush(yamlContent)

    console.log(`[DailyFortune] AI 分析完成: ${notification.title}`)

    // 4. 发送 Bark 推送
    const barkConfig: BarkConfig = {
      serverUrl: env.BARK_SERVER_URL,
      deviceKey: env.BARK_DEVICE_KEY,
    }

    await sendBarkNotification(barkConfig, notification)

    console.log(`[DailyFortune] 推送成功`)

    return {
      success: true,
      message: `成功推送 ${targetDate} 运势: ${notification.title}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[DailyFortune] 执行失败:`, errorMessage)
    return {
      success: false,
      message: `执行失败: ${errorMessage}`,
    }
  }
}

export default {
  /**
   * HTTP 请求处理 - 用于手动触发或测试
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // 健康检查
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 手动触发推送
    if (url.pathname === '/trigger') {
      const result = await executeDailyFortune(env)
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 预览运势数据（不推送）
    if (url.pathname === '/preview') {
      try {
        const userProfile = parseUserProfile(env.USER_PROFILE)
        const targetDate = url.searchParams.get('date') || getTodayDate()

        const fortuneData = buildDailyFortuneData({
          ...userProfile,
          targetDate,
        })

        return new Response(JSON.stringify(fortuneData, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response('Fate Push Service\n\nEndpoints:\n- /health - 健康检查\n- /trigger - 手动触发推送\n- /preview?date=YYYY-MM-DD - 预览命理数据', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  },

  /**
   * 定时任务处理 - 每日自动推送
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Scheduled] Cron triggered at ${new Date(controller.scheduledTime).toISOString()}`)
    ctx.waitUntil(executeDailyFortune(env))
  },
} satisfies ExportedHandler<Env>

import { buildDailyFortuneData } from './fortune'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts'
import { chatCompletion, extractJson, type AIConfig } from './ai'
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

  // 安全路径前缀（用于隐藏 Worker 入口，避免被直接探测）
  // 示例：SAFE_PATH=__my_secret__
  // 则访问路径变为 /__my_secret__/health 等
  SAFE_PATH: string

  // Bark 配置
  BARK_SERVER_URL: string // e.g., https://api.day.app
  BARK_DEVICE_KEY: string

  // 命主配置 (JSON 字符串)
  USER_PROFILE: string // {"gender":"male","birthDate":"1990-01-01","birthTime":"12:00"}
}

function notFoundEmpty(): Response {
  // 仅返回状态码，不包含任何内容
  return new Response(null, { status: 404 })
}

function normalizeSafeBasePath(value: string | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  // 去掉末尾的 /，保证匹配逻辑一致
  const normalized = withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash
  // '/' 或空字符串没有任何“安全前缀”意义，直接视为未配置
  if (!normalized || normalized === '/') return null
  return normalized
}

function stripSafeBasePath(pathname: string, safeBasePath: string): string | null {
  if (pathname === safeBasePath) return '/'
  const prefix = `${safeBasePath}/`
  if (!pathname.startsWith(prefix)) return null
  return pathname.slice(safeBasePath.length) || '/'
}

function parseUserProfile(json: string): UserProfile {
  const raw = JSON.parse(json) as Partial<Record<string, unknown>>
  return {
    gender: (raw.gender as UserProfile['gender']) ?? 'male',
    birthDate: String(raw.birthDate ?? ''),
    birthTime: String(raw.birthTime ?? ''),
  }
}

function isValidYmd(dateStr: string): boolean {
  // Fast path: format check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map((v) => Number(v))
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (m < 1 || m > 12) return false
  if (d < 1 || d > 31) return false

  // Real date check (handles leap years, month lengths)
  const dt = new Date(`${dateStr}T00:00:00.000Z`)
  if (Number.isNaN(dt.getTime())) return false
  const iso = dt.toISOString().slice(0, 10)
  return iso === dateStr
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

    // 3. 提取 JSON 并转换为推送格式
    const jsonContent = extractJson(aiResponse)
    const notification = formatToPush(jsonContent)

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

    const safeBasePath = normalizeSafeBasePath(env.SAFE_PATH)
    if (!safeBasePath) {
      // 未配置安全路径时：默认拒绝所有 HTTP 请求，避免误暴露
      return notFoundEmpty()
    }

    const pathAfterSafe = stripSafeBasePath(url.pathname, safeBasePath)
    if (!pathAfterSafe) {
      // 不带安全路径前缀的直接请求：404 且空内容
      return notFoundEmpty()
    }

    // 仅当带安全路径访问根路径时，才回显请求方法
    if (pathAfterSafe === '/' || pathAfterSafe === '') {
      return new Response(request.method, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // 健康检查
    if (pathAfterSafe === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 手动触发推送
    if (pathAfterSafe === '/trigger') {
      const result = await executeDailyFortune(env)
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 预览运势数据（不推送）
    if (pathAfterSafe === '/preview') {
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

    // 获取指定日期的提示词（system + user）
    // 支持：
    // - /prompt?date=YYYY-MM-DD
    // - /prompt/YYYY-MM-DD
    if (pathAfterSafe === '/prompt' || pathAfterSafe.startsWith('/prompt/')) {
      try {
        const userProfile = parseUserProfile(env.USER_PROFILE)

        let targetDate = url.searchParams.get('date') || ''
        if (!targetDate && pathAfterSafe.startsWith('/prompt/')) {
          targetDate = decodeURIComponent(pathAfterSafe.slice('/prompt/'.length))
        }
        if (!targetDate) {
          return new Response(JSON.stringify({ error: 'Missing date. Use ?date=YYYY-MM-DD or /prompt/YYYY-MM-DD' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (!isValidYmd(targetDate)) {
          return new Response(JSON.stringify({ error: 'Invalid date. Expected YYYY-MM-DD' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const fortuneData = buildDailyFortuneData({
          ...userProfile,
          targetDate,
        })

        return new Response(
          JSON.stringify(
            {
              date: targetDate,
              systemPrompt: SYSTEM_PROMPT,
              userPrompt: buildUserPrompt(fortuneData),
            },
            null,
            2
          ),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // 未匹配到任何端点：不暴露信息
    return notFoundEmpty()
  },

  /**
   * 定时任务处理 - 每日自动推送
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Scheduled] Cron triggered at ${new Date(controller.scheduledTime).toISOString()}`)
    ctx.waitUntil(executeDailyFortune(env))
  },
} satisfies ExportedHandler<Env>

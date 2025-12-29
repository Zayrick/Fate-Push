/**
 * 命主信息配置
 */
export type UserProfile = {
  gender: 'male' | 'female'
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
}

/**
 * 每日运势计算参数
 */
export type DailyFortuneParams = UserProfile & {
  targetDate: string // YYYY-MM-DD 要测算的日期
}

/**
 * 命理数据（用于构建 AI prompt）
 */
export type FortuneData = {
  // 命主信息
  gender: string
  birthDate: string
  birthTime: string
  virtualAge: number

  // 八字
  bazi: string[]
  dayMaster: string

  // 大运
  currentDaYun: string
  daYunStartAge: number
  daYunEndAge: number

  // 目标日期
  targetDate: string
  targetYear: number
  weekDay: string
  lunarDate: string
  lunarMonth: string

  // 流年流月流日
  liuNian: string
  liuYue: string
  liuRi: string
  dayGan: string
  dayZhi: string
}

/**
 * AI 输出的 JSON 结构
 */
export type DailyFortuneResult = {
  date: string
  ganZhi: string
  luck: number
  theme: string
  summary: string
  career: string
  wealth: string
  relationship: string
  health: string
  advice: string
  luckyColor: string
  luckyDirection: string
  luckyNumber: number
}

/**
 * Bark 推送格式
 */
export type PushNotification = {
  title: string
  subtitle: string
  markdown: string
}

/**
 * Bark API 请求参数
 */
export type BarkRequest = {
  title: string
  subtitle?: string
  body?: string
  markdown?: string
  device_key: string
  group?: string
  icon?: string
  sound?: string
  level?: 'active' | 'timeSensitive' | 'passive' | 'critical'
  isArchive?: number
}

/**
 * OpenAI 格式的消息
 */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * OpenAI 格式的请求
 */
export type ChatCompletionRequest = {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
}

/**
 * OpenAI 格式的响应
 */
export type ChatCompletionResponse = {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

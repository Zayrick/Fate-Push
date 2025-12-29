import { describe, it, expect } from 'vitest'
import { formatToPush } from '../src/bark'

describe('formatToPush', () => {
  it('uses fixed title prefix 今日运势·', () => {
    const json = JSON.stringify({
      date: "2025-12-28",
      ganZhi: "壬辰",
      luck: 7,
      theme: "财运亨通",
      summary: "今日偏财星临门，适合投资理财、商业谈判。地支子水生助日主，精力充沛。注意午后有口舌是非，宜低调。",
      career: "工作顺利，贵人相助，适合推进重要项目",
      wealth: "偏财运佳，可小额投机，忌大额借贷",
      relationship: "人际和谐，利于社交，桃花运一般",
      health: "精神饱满，注意肾脏，忌熬夜",
      advice: "宜：签约、投资、社交、出行。忌：争执、熬夜、动土。",
      luckyColor: "蓝色",
      luckyDirection: "北方",
      luckyNumber: 1
    })

    const push = formatToPush(json)

    expect(push.title).toBe('今日运势·财运亨通')
    expect(push.subtitle).toContain('2025-12-28')
    expect(push.subtitle).toContain('壬辰')
    expect(push.subtitle).toContain('运势 7/10')
    expect(push.markdown).toContain('**综合分析**')
  })
})

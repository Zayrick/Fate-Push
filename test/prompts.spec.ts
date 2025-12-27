import { describe, it, expect } from 'vitest'
import { buildUserPrompt } from '../src/prompts'
import type { FortuneData } from '../src/types'

describe('buildUserPrompt', () => {
  it('generates stable user prompt', () => {
    const data: FortuneData = {
      gender: 'male',
      birthDate: '2003-01-06',
      birthTime: '02:00',
      virtualAge: 23,

      bazi: ['癸未', '乙丑', '壬辰', '辛丑'],
      dayMaster: '壬',

      currentDaYun: '丙寅',
      daYunStartAge: 17,
      daYunEndAge: 27,

      targetDate: '2025-12-28',
      targetYear: 2025,
      weekDay: '周日',
      lunarDate: '农历十一月初九',
      lunarMonth: '十一',

      liuNian: '乙巳',
      liuYue: '戊子',
      liuRi: '壬辰',
      dayGan: '壬',
      dayZhi: '辰',
    }

    const prompt = buildUserPrompt(data)

    const expected = `请为命主生成【2025-12-28】的运势分析。

## 目标日期（已计算，禁止改动）
阳历: 2025-12-28 周日
农历: 农历十一月初九
流日干支: 壬辰

## 命主信息
性别: male
出生: 2003-01-06 02:00
当前虚岁: 23岁

## 八字四柱（已排盘，禁止改动）
年柱: 癸未
月柱: 乙丑
日柱: 壬辰  ← 日主: 壬
时柱: 辛丑

## 当前运势周期（已计算，禁止改动）
大运: 丙寅 (17-27岁)
流年: 乙巳 (2025年)
流月: 戊子 (农历十一月)

## 今日干支信息
流日干: 壬
流日支: 辰

请严格按照系统提示词格式输出今日运势 YAML。`

    expect(prompt).toBe(expected)
  })
})

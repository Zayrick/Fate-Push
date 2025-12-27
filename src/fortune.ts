import { Solar } from 'lunar-typescript'
import type { DailyFortuneParams, FortuneData } from './types'

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 解析日期字符串为年月日
 */
function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number)
  return { year, month, day }
}

/**
 * 解析时间字符串为时分
 */
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number)
  return { hour, minute }
}

/**
 * 构建每日运势所需的命理数据
 */
export function buildDailyFortuneData(params: DailyFortuneParams): FortuneData {
  const { gender, birthDate, birthTime, targetDate } = params

  // 解析出生信息
  const birth = parseDate(birthDate)
  const time = parseTime(birthTime)
  const birthSolar = Solar.fromYmdHms(
    birth.year,
    birth.month,
    birth.day,
    time.hour,
    time.minute,
    0
  )
  const birthLunar = birthSolar.getLunar()
  const eightChar = birthLunar.getEightChar()

  // 获取八字四柱
  const bazi = [
    eightChar.getYear(),
    eightChar.getMonth(),
    eightChar.getDay(),
    eightChar.getTime(),
  ]
  const dayMaster = eightChar.getDayGan() // 日主天干

  // 获取大运
  const genderFlag = gender === 'male' ? 1 : 0
  const yun = eightChar.getYun(genderFlag)
  const daYunList = yun.getDaYun()

  // 计算目标日期信息
  const target = parseDate(targetDate)
  const virtualAge = target.year - birth.year + 1

  // 查找当前大运
  const currentDaYun = daYunList.find(
    (d) => virtualAge >= d.getStartAge() && virtualAge <= d.getEndAge()
  )

  // 获取目标日期的干支
  const targetSolar = Solar.fromYmd(target.year, target.month, target.day)
  const targetLunar = targetSolar.getLunar()

  const liuNian = targetLunar.getYearInGanZhiExact() // 流年
  const liuYue = targetLunar.getMonthInGanZhiExact() // 流月
  const liuRi = targetLunar.getDayInGanZhi() // 流日

  // 流日干支拆分
  const dayGan = liuRi.charAt(0)
  const dayZhi = liuRi.charAt(1)

  // 计算星期几
  const weekDayIndex = new Date(targetDate).getDay()

  return {
    // 命主信息
    gender: gender === 'male' ? '男' : '女',
    birthDate,
    birthTime,
    virtualAge,

    // 八字
    bazi,
    dayMaster,

    // 大运
    currentDaYun: currentDaYun?.getGanZhi() || '童限',
    daYunStartAge: currentDaYun?.getStartAge() || 1,
    daYunEndAge: currentDaYun?.getEndAge() || 10,

    // 目标日期
    targetDate,
    targetYear: target.year,
    weekDay: WEEK_DAYS[weekDayIndex],
    lunarDate: `${targetLunar.getYearInChinese()}年${targetLunar.getMonthInChinese()}月${targetLunar.getDayInChinese()}`,
    lunarMonth: targetLunar.getMonthInChinese(),

    // 流年流月流日
    liuNian,
    liuYue,
    liuRi,
    dayGan,
    dayZhi,
  }
}

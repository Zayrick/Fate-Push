# Fate Push - 每日运势推送服务

基于 Cloudflare Worker 的每日八字运势推送服务，通过 AI 分析命理数据，自动推送到 Bark。

## 项目结构

```
src/
├── index.ts      # Worker 入口，处理 HTTP 和定时任务
├── types.ts      # 类型定义
├── fortune.ts    # 命理数据计算（使用 lunar-typescript）
├── prompts.ts    # AI 提示词
├── ai.ts         # OpenAI 格式 API 调用
└── bark.ts       # Bark 推送服务
```

## 配置说明

### 环境变量 (Secrets)

所有敏感配置通过 Wrangler Secrets 管理：

```bash
# AI 配置
wrangler secret put AI_API_KEY       # AI API 密钥
wrangler secret put AI_BASE_URL      # 如 https://api.openai.com/v1
wrangler secret put AI_MODEL         # 如 gpt-4o

# Bark 配置
wrangler secret put BARK_SERVER_URL  # 如 https://api.day.app
wrangler secret put BARK_DEVICE_KEY  # Bark 设备密钥

# 命主信息
wrangler secret put USER_PROFILE     # JSON 格式
```

### USER_PROFILE 格式

```json
{
  "gender": "male",
  "birthDate": "1990-01-01",
  "birthTime": "12:00"
}
```

- `gender`: `male` 或 `female`
- `birthDate`: 出生日期 `YYYY-MM-DD`
- `birthTime`: 出生时间 `HH:mm`

## API 端点

| 端点 | 说明 |
|------|------|
| `GET /` | 服务信息 |
| `GET /health` | 健康检查 |
| `GET /trigger` | 手动触发推送 |
| `GET /preview?date=YYYY-MM-DD` | 预览命理数据（不推送） |

## 定时任务

默认配置为每天 UTC 23:00（北京时间 07:00）自动推送。

修改 `wrangler.jsonc` 中的 `triggers.crons` 调整时间：

```jsonc
"triggers": {
  "crons": ["0 23 * * *"]  // UTC 时间
}
```

## 本地开发

```bash
# 安装依赖
npm install

# 本地开发（需要先配置 .dev.vars 文件）
npm run dev

# 类型检查
npx tsc --noEmit

# 运行测试
npm test
```

### .dev.vars 文件（本地开发用）

创建 `.dev.vars` 文件用于本地开发：

```
AI_API_KEY=your_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
BARK_SERVER_URL=https://api.day.app
BARK_DEVICE_KEY=your_device_key
USER_PROFILE={"gender":"male","birthDate":"1990-01-01","birthTime":"12:00"}
```

## 部署

```bash
# 部署到 Cloudflare
npm run deploy

# 配置 secrets（首次部署后执行）
wrangler secret put AI_API_KEY
wrangler secret put AI_BASE_URL
wrangler secret put AI_MODEL
wrangler secret put BARK_SERVER_URL
wrangler secret put BARK_DEVICE_KEY
wrangler secret put USER_PROFILE
```

## 推送效果示例

**标题**: `今日运势·贵人暗助`

**副标题**: `2025-12-28 壬辰 | 运势 6/10`

**内容**:
```
**综合分析**
今日壬水偏印临门，主学习、思考、贵人暗中相助...

**事业**: 工作稳定，适合学习新技能
**财运**: 财运平平，守成为主
**人际**: 贵人运佳，可请教长辈
**健康**: 注意脾胃，饮食清淡

**宜忌**: 宜：学习、整理、请教。忌：投机、争执。

幸运色: 黑色 | 方位: 北方 | 数字: 6
```

## 技术栈

- **Runtime**: Cloudflare Workers
- **命理计算**: lunar-typescript
- **AI**: OpenAI 格式 API
- **推送**: Bark

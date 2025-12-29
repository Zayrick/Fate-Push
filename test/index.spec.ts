import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Safe path worker', () => {
	it('returns 404 with empty body when SAFE_PATH is missing (unit style)', async () => {
			delete (env as any).SAFE_PATH
		const request = new IncomingRequest('http://example.com')
		const ctx = createExecutionContext()
		const response = await worker.fetch(request, env as any, ctx)
		await waitOnExecutionContext(ctx)
		expect(response.status).toBe(404)
		expect(await response.text()).toBe('')
	})

	it('echoes method only when path has SAFE_PATH prefix (unit style)', async () => {
		const ctx = createExecutionContext()
		const response = await worker.fetch(
			new IncomingRequest('http://example.com/__test__safe__'),
			{ SAFE_PATH: '__test__safe__' } as any,
			ctx
		)
		await waitOnExecutionContext(ctx)
		expect(response.status).toBe(200)
		expect(await response.text()).toBe('GET')
	})

	it('health check works under SAFE_PATH prefix (unit style)', async () => {
		const ctx = createExecutionContext()
		const response = await worker.fetch(
			new IncomingRequest('http://example.com/__test__safe__/health'),
			{ SAFE_PATH: '__test__safe__' } as any,
			ctx
		)
		await waitOnExecutionContext(ctx)
		expect(response.status).toBe(200)
		const json = (await response.json()) as { status: string }
		expect(json.status).toBe('ok')
	})

	it('prompt endpoint returns system + user prompts for a given date (unit style)', async () => {
		const ctx = createExecutionContext()
		const response = await worker.fetch(
			new IncomingRequest('http://example.com/__test__safe__/prompt/2025-12-28'),
			{
				SAFE_PATH: '__test__safe__',
				USER_PROFILE: JSON.stringify({
					gender: 'male',
					birthDate: '2003-01-06',
					birthTime: '02:00',
				}),
			} as any,
			ctx
		)
		await waitOnExecutionContext(ctx)
		expect(response.status).toBe(200)
		const json = (await response.json()) as { date: string; systemPrompt: string; userPrompt: string }
		expect(json.date).toBe('2025-12-28')
		expect(json.systemPrompt).toContain('八字命理大师')
		expect(json.userPrompt).toContain('请为命主生成【2025-12-28】的运势分析')
	})

	it('prompt endpoint rejects invalid date (unit style)', async () => {
		const ctx = createExecutionContext()
		const response = await worker.fetch(
			new IncomingRequest('http://example.com/__test__safe__/prompt/2025-99-99'),
			{
				SAFE_PATH: '__test__safe__',
				USER_PROFILE: JSON.stringify({
					gender: 'male',
					birthDate: '2003-01-06',
					birthTime: '02:00',
				}),
			} as any,
			ctx
		)
		await waitOnExecutionContext(ctx)
		expect(response.status).toBe(400)
		const json = (await response.json()) as { error: string }
		expect(json.error).toContain('Invalid date')
	})

	it('integration: without SAFE_PATH returns 404 empty', async () => {
			delete (env as any).SAFE_PATH
		const response = await SELF.fetch('https://example.com')
		expect(response.status).toBe(404)
		expect(await response.text()).toBe('')
	})
})

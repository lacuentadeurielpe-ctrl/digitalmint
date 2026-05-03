import OpenAI from 'openai'
import { extractJson } from './utils'

export function createDeepSeek() {
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
    // Vercel Hobby = 60s. Cap requests at 45s so we always have time to recover.
    timeout: 45_000,
    maxRetries: 0,
  })
}

export async function deepseekJSON<T>(
  systemPrompt: string,
  userContent: string,
  maxTokens = 4000
): Promise<T> {
  const client = createDeepSeek()
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.6,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })
  const raw = response.choices[0].message.content ?? '{}'
  return extractJson<T>(raw)
}

export async function deepseekText(
  systemPrompt: string,
  userContent: string,
  maxTokens = 5000
): Promise<string> {
  const client = createDeepSeek()
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.75,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })
  return response.choices[0].message.content ?? ''
}

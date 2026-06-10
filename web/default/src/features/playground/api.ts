/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'
import { API_ENDPOINTS } from './constants'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  GroupOption,
  ImageGenerationRequest,
  ImageGenerationResponse,
  PlaygroundOptions,
  PlaygroundTokenOption,
} from './types'

/**
 * Send chat completion request (non-streaming)
 */
export async function sendChatCompletion(
  payload: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const res = await api.post(API_ENDPOINTS.CHAT_COMPLETIONS, payload, {
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

/**
 * 发送图片生成请求
 */
export async function sendImageGeneration(
  payload: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const res = await api.post(API_ENDPOINTS.IMAGE_GENERATIONS, payload, {
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

export async function getPlaygroundOptions(): Promise<PlaygroundOptions> {
  const res = await api.get(API_ENDPOINTS.OPTIONS, {
    skipErrorHandler: true,
  })
  const { data } = res

  if (!data.success || !data.data) {
    return {
      groups: [],
      group_models: {},
      model_endpoints: {},
      tokens: [],
    }
  }

  const raw = data.data as {
    groups?: Array<GroupOption & { ratio?: number | string }>
    group_models?: Record<string, string[]>
    model_endpoints?: Record<string, string[]>
    tokens?: PlaygroundTokenOption[]
  }

  return {
    groups: (raw.groups ?? []).map((group) => ({
      ...group,
      ratio: typeof group.ratio === 'number' ? group.ratio : undefined,
    })),
    group_models: raw.group_models ?? {},
    model_endpoints: raw.model_endpoints ?? {},
    tokens: raw.tokens ?? [],
  }
}

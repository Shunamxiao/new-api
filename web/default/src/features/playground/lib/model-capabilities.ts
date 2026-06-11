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
import type { PlaygroundMode } from '../types'

const CHAT_ENDPOINTS = new Set(['openai', 'anthropic', 'gemini'])
const IMAGE_ENDPOINTS = new Set(['image-generation', 'image-edit'])

function normalizeModelName(modelName: string) {
  return modelName.trim().toLowerCase()
}

export function isImageGenerationModel(modelName: string) {
  const model = normalizeModelName(modelName)
  return (
    model.includes('dall-e-3') ||
    model.includes('dall-e-2') ||
    model.includes('gpt-image-') ||
    model.startsWith('imagen-') ||
    model.includes('flux-') ||
    model.includes('flux.1-')
  )
}

export function isSpecializedNonChatModel(modelName: string) {
  const model = normalizeModelName(modelName)
  return (
    isImageGenerationModel(model) ||
    model.includes('embedding') ||
    model.includes('embed') ||
    model.startsWith('m3e') ||
    model.includes('bge-') ||
    model.includes('rerank') ||
    model.includes('reranker') ||
    model.includes('whisper') ||
    model.includes('audio') ||
    model.startsWith('tts-') ||
    model.includes('sora') ||
    model.includes('video') ||
    model.includes('veo') ||
    model.includes('kling') ||
    model.includes('vidu') ||
    model.includes('jimeng') ||
    model.includes('seedance') ||
    model.includes('o3-pro') ||
    model.includes('o3-deep-research') ||
    model.includes('o4-mini-deep-research') ||
    model.includes('codex')
  )
}

export function supportsImageMode(modelName: string, endpoints?: string[]) {
  if (endpoints?.some((endpoint) => IMAGE_ENDPOINTS.has(endpoint))) {
    return true
  }
  return isImageGenerationModel(modelName)
}

export function supportsChatMode(modelName: string, endpoints?: string[]) {
  if (isSpecializedNonChatModel(modelName)) {
    return false
  }
  if (!endpoints || endpoints.length === 0) {
    return true
  }
  if (endpoints.some((endpoint) => CHAT_ENDPOINTS.has(endpoint))) {
    return true
  }
  return false
}

export function supportsPlaygroundMode(
  modelName: string,
  mode: PlaygroundMode,
  modelEndpoints: Record<string, string[]> = {}
) {
  const endpoints = modelEndpoints[modelName]
  if (mode === 'image') {
    return supportsImageMode(modelName, endpoints)
  }
  return supportsChatMode(modelName, endpoints)
}

export function filterModelsForMode(
  modelNames: string[],
  mode: PlaygroundMode,
  modelEndpoints: Record<string, string[]> = {}
) {
  return modelNames.filter((modelName) =>
    supportsPlaygroundMode(modelName, mode, modelEndpoints)
  )
}

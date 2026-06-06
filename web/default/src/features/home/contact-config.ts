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
export type HomeContactConfig = {
  apiBaseUrl: string
  apiEndpoint: string
  docsUrl: string
  imageGenerationUrl: string
  contactUrl: string
  rechargeUrl: string
  contactTitle: string
  contactDescription: string
}

export const DEFAULT_HOME_CONTACT_CONFIG: HomeContactConfig = {
  apiBaseUrl: '',
  apiEndpoint: '/images/generations',
  docsUrl: '/docs',
  imageGenerationUrl: '',
  contactUrl: '',
  rechargeUrl: '/topup',
  contactTitle: 'Contact us',
  contactDescription:
    'Configure contact methods, recharge entry, and service links for visitors.',
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function getDefaultApiBaseUrl(serverAddress?: string) {
  const normalized = normalizeString(serverAddress)
  if (normalized) return `${normalized.replace(/\/+$/, '')}/v1`

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/v1`
  }

  return 'http://localhost:4101/v1'
}

export function parseHomeContactConfig(
  raw: unknown,
  fallback?: Partial<HomeContactConfig>
): HomeContactConfig {
  const base = {
    ...DEFAULT_HOME_CONTACT_CONFIG,
    ...fallback,
  }

  if (typeof raw !== 'string' || raw.trim() === '') return base

  try {
    const parsed = JSON.parse(raw) as Partial<HomeContactConfig>
    return {
      apiBaseUrl: normalizeString(parsed.apiBaseUrl) ?? base.apiBaseUrl,
      apiEndpoint: normalizeString(parsed.apiEndpoint) ?? base.apiEndpoint,
      docsUrl: normalizeString(parsed.docsUrl) ?? base.docsUrl,
      imageGenerationUrl:
        normalizeString(parsed.imageGenerationUrl) ?? base.imageGenerationUrl,
      contactUrl: normalizeString(parsed.contactUrl) ?? base.contactUrl,
      rechargeUrl: normalizeString(parsed.rechargeUrl) ?? base.rechargeUrl,
      contactTitle: normalizeString(parsed.contactTitle) ?? base.contactTitle,
      contactDescription:
        normalizeString(parsed.contactDescription) ?? base.contactDescription,
    }
  } catch {
    return base
  }
}

export function serializeHomeContactConfig(config: HomeContactConfig) {
  return JSON.stringify(config, null, 2)
}

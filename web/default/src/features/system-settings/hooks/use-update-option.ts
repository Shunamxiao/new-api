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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { toast } from 'sonner'
import { updateSystemOption } from '../api'
import type { UpdateOptionRequest } from '../types'

// 这些配置会直接影响 /api/status 消费方，需要同步刷新前端状态缓存。
const STATUS_RELATED_KEYS = [
  'SystemName',
  'Logo',
  'Footer',
  'HomeHeroBadge',
  'HomeHeroTitle',
  'HomeHeroHighlight',
  'HomeHeroDescription',
  'HomeContactConfig',
  'KeysUsageGuide',
  'WalletTopupNotice',
  'theme.frontend',
  'theme.preset',
  'HeaderNavModules',
  'SidebarModulesAdmin',
  'console_setting.api_info',
  'console_setting.api_info_enabled',
  'console_setting.announcements',
  'console_setting.announcements_enabled',
  'console_setting.faq',
  'console_setting.faq_enabled',
  'console_setting.uptime_kuma_enabled',
  'Notice',
  'LogConsumeEnabled',
  'QuotaPerUnit',
  'USDExchangeRate',
  'DisplayInCurrencyEnabled',
  'DisplayTokenStatEnabled',
  'general_setting.quota_display_type',
  'general_setting.custom_currency_symbol',
  'general_setting.custom_currency_exchange_rate',
]

function syncStatusCache(key: string, value: unknown): void {
  try {
    if (!getStatusPatchKey(key)) {
      window.localStorage.removeItem('status')
      return
    }

    const raw = window.localStorage.getItem('status')
    const status =
      raw && typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : {}
    const patched = patchStatusData(status, key, value)
    if (patched && typeof patched === 'object' && !Array.isArray(patched)) {
      window.localStorage.setItem('status', JSON.stringify(patched))
      return
    }
  } catch {
    /* empty */
  }
}

function getStatusPatchKey(key: string): string | null {
  if (key === 'SystemName') return 'system_name'
  if (key === 'Logo') return 'logo'
  if (key === 'Footer') return 'footer_html'
  if (key === 'theme.preset') return 'theme_preset'
  if (key === 'console_setting.api_info') return 'api_info'
  if (key === 'console_setting.api_info_enabled') return 'api_info_enabled'
  if (key === 'console_setting.announcements') return 'announcements'
  if (key === 'console_setting.announcements_enabled') {
    return 'announcements_enabled'
  }
  if (key === 'console_setting.faq') return 'faq'
  if (key === 'console_setting.faq_enabled') return 'faq_enabled'
  if (key === 'console_setting.uptime_kuma_enabled') {
    return 'uptime_kuma_enabled'
  }

  const heroStatusKeys: Record<string, string> = {
    HomeHeroBadge: 'home_hero_badge',
    HomeHeroTitle: 'home_hero_title',
    HomeHeroHighlight: 'home_hero_highlight',
    HomeHeroDescription: 'home_hero_description',
    HomeContactConfig: 'home_contact_config',
    KeysUsageGuide: 'keys_usage_guide',
    WalletTopupNotice: 'wallet_topup_notice',
  }

  if (heroStatusKeys[key]) return heroStatusKeys[key]
  if (key === 'HeaderNavModules' || key === 'SidebarModulesAdmin') return key

  return null
}

function getStatusPatchValue(key: string, value: unknown): unknown {
  if (
    key === 'console_setting.api_info' ||
    key === 'console_setting.announcements' ||
    key === 'console_setting.faq'
  ) {
    if (typeof value !== 'string') return value
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return value
}

function patchStatusData(
  status: unknown,
  key: string,
  value: unknown
): Record<string, unknown> | unknown {
  const statusKey = getStatusPatchKey(key)
  if (!statusKey) return status

  const next =
    status && typeof status === 'object' && !Array.isArray(status)
      ? { ...(status as Record<string, unknown>) }
      : {}

  const nestedData =
    next.data && typeof next.data === 'object' && !Array.isArray(next.data)
      ? { ...(next.data as Record<string, unknown>) }
      : null

  const setValue = (statusKey: string) => {
    const statusValue = getStatusPatchValue(key, value)
    next[statusKey] = statusValue
    if (nestedData) {
      nestedData[statusKey] = statusValue
      next.data = nestedData
    }
  }

  setValue(statusKey)
  return next
}

export function useUpdateOption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateOptionRequest) => updateSystemOption(request),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Always refresh system-options
        queryClient.invalidateQueries({ queryKey: ['system-options'] })

        // If updating frontend-display-related config, also refresh status
        if (STATUS_RELATED_KEYS.includes(variables.key)) {
          queryClient.setQueryData(['status'], (status: unknown) =>
            patchStatusData(status, variables.key, variables.value)
          )
          queryClient.invalidateQueries({ queryKey: ['status'] })
          syncStatusCache(variables.key, variables.value)
        }

        toast.success(i18next.t('Setting updated successfully'))
      } else {
        toast.error(data.message || i18next.t('Failed to update setting'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to update setting'))
    },
  })
}

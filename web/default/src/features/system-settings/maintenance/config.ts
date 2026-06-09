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
import {
  HEADER_NAV_BUILTIN_ITEMS as SHARED_HEADER_NAV_BUILTIN_ITEMS,
  type HeaderNavItem as SharedHeaderNavItem,
} from '@/lib/nav-modules'

export type HeaderNavAccessConfig = {
  enabled: boolean
  requireAuth: boolean
}

export type HeaderNavItemType = 'builtin' | 'link' | 'modal'

export type HeaderNavItemConfig = {
  id: string
  enabled: boolean
  label: string
  type: HeaderNavItemType
  href?: string
  external: boolean
  modalTitle?: string
  modalContent?: string
}

export type HeaderNavModulesConfig = {
  home: boolean
  console: boolean
  pricing: HeaderNavAccessConfig
  rankings: HeaderNavAccessConfig
  docs: boolean
  about: boolean
  items: HeaderNavItemConfig[]
  [key: string]: boolean | HeaderNavAccessConfig | HeaderNavItemConfig[]
}

export type SidebarSectionConfig = {
  enabled: boolean
  [key: string]: boolean
}

export type SidebarModulesAdminConfig = Record<string, SidebarSectionConfig>

const toHeaderNavItemConfig = (
  item: SharedHeaderNavItem
): HeaderNavItemConfig => ({
  id: item.id,
  enabled: item.enabled,
  label: item.label,
  type: item.type,
  href: item.href ?? '',
  external: Boolean(item.external),
  modalTitle: item.modalTitle ?? '',
  modalContent: item.modalContent ?? '',
})

export const HEADER_NAV_BUILTIN_ITEMS: HeaderNavItemConfig[] =
  SHARED_HEADER_NAV_BUILTIN_ITEMS.map(toHeaderNavItemConfig)

export const HEADER_NAV_DEFAULT: HeaderNavModulesConfig = {
  home: true,
  console: true,
  pricing: {
    enabled: true,
    requireAuth: false,
  },
  rankings: {
    enabled: true,
    requireAuth: false,
  },
  docs: true,
  about: true,
  items: HEADER_NAV_BUILTIN_ITEMS.map((item) => ({ ...item })),
}

const BUILTIN_IDS = new Set(HEADER_NAV_BUILTIN_ITEMS.map((item) => item.id))

export const SIDEBAR_MODULES_DEFAULT: SidebarModulesAdminConfig = {
  chat: {
    enabled: true,
    playground: true,
    chat: true,
  },
  console: {
    enabled: true,
    detail: true,
    token: true,
    log: true,
    midjourney: true,
    task: true,
  },
  personal: {
    enabled: true,
    topup: true,
    personal: true,
  },
  admin: {
    enabled: true,
    channel: true,
    models: true,
    redemption: true,
    user: true,
    setting: true,
    subscription: true,
  },
}

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return fallback
}

const cloneHeaderNavDefault = (): HeaderNavModulesConfig => ({
  ...HEADER_NAV_DEFAULT,
  pricing: { ...HEADER_NAV_DEFAULT.pricing },
  rankings: { ...HEADER_NAV_DEFAULT.rankings },
  items: HEADER_NAV_BUILTIN_ITEMS.map((item) => ({ ...item })),
})

const parseAccessModule = (
  raw: unknown,
  fallback: HeaderNavAccessConfig
): HeaderNavAccessConfig => {
  if (
    typeof raw === 'boolean' ||
    typeof raw === 'string' ||
    typeof raw === 'number'
  ) {
    return {
      enabled: toBoolean(raw, fallback.enabled),
      requireAuth: fallback.requireAuth,
    }
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    return {
      enabled: toBoolean(record.enabled, fallback.enabled),
      requireAuth: toBoolean(record.requireAuth, fallback.requireAuth),
    }
  }
  return { ...fallback }
}

const cloneSidebarDefault = (): SidebarModulesAdminConfig =>
  Object.entries(SIDEBAR_MODULES_DEFAULT).reduce<SidebarModulesAdminConfig>(
    (acc, [section, config]) => {
      acc[section] = { ...config }
      return acc
    },
    {}
  )

const defaultItemById = new Map(
  HEADER_NAV_BUILTIN_ITEMS.map((item) => [item.id, item])
)

function parseNavItem(raw: unknown): HeaderNavItemConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const id = String(record.id ?? '').trim()
  if (!id) return null

  const fallback = defaultItemById.get(id)
  const rawType = String(record.type ?? fallback?.type ?? 'link')
  const type: HeaderNavItemType = BUILTIN_IDS.has(id)
    ? 'builtin'
    : rawType === 'modal' || rawType === 'link'
      ? rawType
      : 'link'

  return {
    id,
    enabled: toBoolean(record.enabled, fallback?.enabled ?? true),
    label: String(record.label ?? fallback?.label ?? id).trim() || id,
    type,
    href: BUILTIN_IDS.has(id)
      ? (fallback?.href ?? '')
      : String(record.href ?? '').trim(),
    external: BUILTIN_IDS.has(id) ? false : toBoolean(record.external, false),
    modalTitle: String(record.modalTitle ?? '').trim(),
    modalContent: String(record.modalContent ?? ''),
  }
}

function buildItemsFromLegacy(
  config: HeaderNavModulesConfig
): HeaderNavItemConfig[] {
  return HEADER_NAV_BUILTIN_ITEMS.map((item) => {
    const raw = config[item.id]
    const enabled =
      item.id === 'pricing' || item.id === 'rankings'
        ? Boolean((raw as HeaderNavAccessConfig | undefined)?.enabled)
        : Boolean(raw)
    return { ...item, enabled }
  })
}

function normalizeHeaderNavItems(
  parsedItems: unknown,
  config: HeaderNavModulesConfig
): HeaderNavItemConfig[] {
  if (!Array.isArray(parsedItems)) return buildItemsFromLegacy(config)

  const items = parsedItems
    .map(parseNavItem)
    .filter((item): item is HeaderNavItemConfig => Boolean(item))

  return items.length > 0 ? items : buildItemsFromLegacy(config)
}

function syncLegacyHeaderFields(
  config: HeaderNavModulesConfig
): HeaderNavModulesConfig {
  const next: HeaderNavModulesConfig = {
    ...config,
    pricing: { ...config.pricing },
    rankings: { ...config.rankings },
    items: config.items.map((item) => ({ ...item })),
  }

  for (const item of next.items) {
    if (!BUILTIN_IDS.has(item.id)) continue
    if (item.id === 'pricing') {
      next.pricing.enabled = item.enabled
      continue
    }
    if (item.id === 'rankings') {
      next.rankings.enabled = item.enabled
      continue
    }
    next[item.id] = item.enabled
  }

  return next
}

export function parseHeaderNavModules(
  value: string | null | undefined
): HeaderNavModulesConfig {
  const base = cloneHeaderNavDefault()
  if (!value) {
    return base
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const result: HeaderNavModulesConfig = {
      ...base,
      pricing: { ...base.pricing },
      rankings: { ...base.rankings },
      items: [],
    }

    Object.entries(parsed).forEach(([key, raw]) => {
      if (key === 'items') return
      if (key === 'pricing') {
        result.pricing = parseAccessModule(raw, base.pricing)
        return
      }
      if (key === 'rankings') {
        result.rankings = parseAccessModule(raw, base.rankings)
        return
      }

      if (typeof raw === 'boolean') {
        result[key] = raw
        return
      }
      if (typeof raw === 'string' || typeof raw === 'number') {
        result[key] = toBoolean(raw, Boolean(base[key]))
        return
      }
    })

    result.items = normalizeHeaderNavItems(parsed.items, result)
    return syncLegacyHeaderFields(result)
  } catch {
    return base
  }
}

export function serializeHeaderNavModules(
  config: HeaderNavModulesConfig
): string {
  return JSON.stringify(syncLegacyHeaderFields(config))
}

export function parseSidebarModulesAdmin(
  value: string | null | undefined
): SidebarModulesAdminConfig {
  const defaults = cloneSidebarDefault()
  // If empty string, null, or undefined, use default config
  if (!value || value.trim() === '') return defaults

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const result: SidebarModulesAdminConfig = {}

    Object.entries(parsed).forEach(([sectionKey, raw]) => {
      if (!raw || typeof raw !== 'object') return

      const defaultSection = defaults[sectionKey] ?? { enabled: true }
      const sectionConfig: SidebarSectionConfig = {
        enabled: toBoolean(
          (raw as Record<string, unknown>).enabled,
          defaultSection.enabled ?? true
        ),
      }

      Object.entries(raw as Record<string, unknown>).forEach(
        ([moduleKey, moduleValue]) => {
          if (moduleKey === 'enabled') return
          sectionConfig[moduleKey] = toBoolean(
            moduleValue,
            defaultSection[moduleKey] ?? true
          )
        }
      )

      result[sectionKey] = sectionConfig
    })

    // Merge defaults to ensure expected sections exist
    Object.entries(defaults).forEach(([sectionKey, config]) => {
      if (!result[sectionKey]) {
        result[sectionKey] = { ...config }
        return
      }

      Object.entries(config).forEach(([moduleKey, moduleValue]) => {
        if (!(moduleKey in result[sectionKey])) {
          result[sectionKey][moduleKey] = moduleValue
        }
      })
    })

    return result
  } catch {
    return defaults
  }
}

export function serializeSidebarModulesAdmin(
  config: SidebarModulesAdminConfig
): string {
  return JSON.stringify(config)
}

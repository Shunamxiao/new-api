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
import { getStatus } from '@/lib/api'

export type ModuleAccess = { enabled: boolean; requireAuth: boolean }

export type HeaderNavModule = 'rankings' | 'pricing'

export type HeaderNavItemAction = 'link' | 'modal'

export type HeaderNavItemType = 'builtin' | 'link' | 'modal'

export type HeaderNavItem = {
  id: string
  enabled: boolean
  label: string
  type: HeaderNavItemType
  href?: string
  external?: boolean
  modalTitle?: string
  modalContent?: string
}

export type HeaderNavModules = {
  home: boolean
  console: boolean
  pricing: ModuleAccess
  rankings: ModuleAccess
  docs: boolean
  about: boolean
  items: HeaderNavItem[]
  [key: string]: boolean | ModuleAccess | HeaderNavItem[]
}

const DEFAULT_HEADER_NAV_MODULES: HeaderNavModules = {
  home: true,
  console: true,
  pricing: { enabled: true, requireAuth: false },
  rankings: { enabled: true, requireAuth: false },
  docs: true,
  about: true,
  items: [],
}

export const HEADER_NAV_BUILTIN_ITEMS: HeaderNavItem[] = [
  { id: 'home', enabled: true, label: 'Home', type: 'builtin', href: '/' },
  {
    id: 'console',
    enabled: true,
    label: 'Console',
    type: 'builtin',
    href: '/dashboard',
  },
  {
    id: 'pricing',
    enabled: true,
    label: 'Model Square',
    type: 'builtin',
    href: '/pricing',
  },
  {
    id: 'rankings',
    enabled: true,
    label: 'Rankings',
    type: 'builtin',
    href: '/rankings',
  },
  { id: 'docs', enabled: true, label: 'Docs', type: 'builtin', href: '/docs' },
  {
    id: 'about',
    enabled: true,
    label: 'About',
    type: 'builtin',
    href: '/about',
  },
]

const BUILTIN_IDS = new Set(HEADER_NAV_BUILTIN_ITEMS.map((item) => item.id))
const builtinItemById = new Map(
  HEADER_NAV_BUILTIN_ITEMS.map((item) => [item.id, item])
)

const DEFAULTS: Record<HeaderNavModule, ModuleAccess> = {
  pricing: DEFAULT_HEADER_NAV_MODULES.pricing,
  rankings: DEFAULT_HEADER_NAV_MODULES.rankings,
}

function cloneHeaderNavDefaults(): HeaderNavModules {
  return {
    ...DEFAULT_HEADER_NAV_MODULES,
    pricing: { ...DEFAULT_HEADER_NAV_MODULES.pricing },
    rankings: { ...DEFAULT_HEADER_NAV_MODULES.rankings },
    items: HEADER_NAV_BUILTIN_ITEMS.map((item) => ({ ...item })),
  }
}

export function parseHeaderNavBoolean(
  raw: unknown,
  fallback: boolean
): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') {
    if (raw === 1) return true
    if (raw === 0) return false
    return fallback
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return fallback
}

function parseAccess(raw: unknown, fallback: ModuleAccess): ModuleAccess {
  if (
    typeof raw === 'boolean' ||
    typeof raw === 'number' ||
    typeof raw === 'string'
  ) {
    return {
      enabled: parseHeaderNavBoolean(raw, fallback.enabled),
      requireAuth: fallback.requireAuth,
    }
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return {
      enabled: parseHeaderNavBoolean(r.enabled, fallback.enabled),
      requireAuth: parseHeaderNavBoolean(r.requireAuth, fallback.requireAuth),
    }
  }
  return { ...fallback }
}

function parseHeaderNavRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || String(raw).trim() === '') return null
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>

  try {
    return JSON.parse(String(raw)) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseNavItem(raw: unknown): HeaderNavItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const id = String(record.id ?? '').trim()
  if (!id) return null

  const fallback = builtinItemById.get(id)
  const rawType = String(record.type ?? fallback?.type ?? 'link')
  const type: HeaderNavItemType = BUILTIN_IDS.has(id)
    ? 'builtin'
    : rawType === 'modal' || rawType === 'link'
      ? rawType
      : 'link'

  return {
    id,
    enabled: parseHeaderNavBoolean(record.enabled, fallback?.enabled ?? true),
    label: String(record.label ?? fallback?.label ?? id).trim() || id,
    type,
    href: BUILTIN_IDS.has(id)
      ? (fallback?.href ?? '')
      : String(record.href ?? '').trim(),
    external: BUILTIN_IDS.has(id)
      ? false
      : parseHeaderNavBoolean(record.external, false),
    modalTitle: String(record.modalTitle ?? '').trim(),
    modalContent: String(record.modalContent ?? ''),
  }
}

function buildLegacyItems(modules: HeaderNavModules): HeaderNavItem[] {
  return HEADER_NAV_BUILTIN_ITEMS.map((item) => {
    const raw = modules[item.id]
    const enabled =
      item.id === 'pricing' || item.id === 'rankings'
        ? Boolean((raw as ModuleAccess | undefined)?.enabled)
        : Boolean(raw)
    return { ...item, enabled }
  })
}

export function parseHeaderNavModules(raw: unknown): HeaderNavModules {
  const result = cloneHeaderNavDefaults()
  const parsed = parseHeaderNavRecord(raw)
  if (!parsed) {
    result.items = buildLegacyItems(result)
    return result
  }

  Object.entries(parsed).forEach(([key, value]) => {
    if (key === 'items') return
    if (key === 'pricing') {
      result.pricing = parseAccess(value, result.pricing)
      return
    }
    if (key === 'rankings') {
      result.rankings = parseAccess(value, result.rankings)
      return
    }

    const fallback = result[key]
    if (
      typeof fallback === 'boolean' ||
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string'
    ) {
      result[key] = parseHeaderNavBoolean(
        value,
        typeof fallback === 'boolean' ? fallback : true
      )
    }
  })

  if (Array.isArray(parsed.items)) {
    const items = parsed.items
      .map(parseNavItem)
      .filter((item): item is HeaderNavItem => Boolean(item))
    result.items = items.length > 0 ? items : buildLegacyItems(result)
  } else {
    result.items = buildLegacyItems(result)
  }

  return result
}

export function parseHeaderNavModulesFromStatus(
  status: Record<string, unknown> | null
): HeaderNavModules {
  const nestedData =
    status?.data &&
    typeof status.data === 'object' &&
    !Array.isArray(status.data)
      ? (status.data as Record<string, unknown>)
      : null
  return parseHeaderNavModules(
    status?.HeaderNavModules ?? nestedData?.HeaderNavModules
  )
}

function getCachedStatus(): Record<string, unknown> | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem('status')
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function cacheStatus(status: Record<string, unknown> | null): void {
  try {
    if (typeof window !== 'undefined' && status) {
      window.localStorage.setItem('status', JSON.stringify(status))
    }
  } catch {
    /* empty */
  }
}

export function getModuleAccessFromStatus(
  status: Record<string, unknown> | null,
  module: HeaderNavModule
): ModuleAccess {
  return parseHeaderNavModulesFromStatus(status)[module] ?? DEFAULTS[module]
}

export function getModuleAccess(module: HeaderNavModule): ModuleAccess {
  return getModuleAccessFromStatus(getCachedStatus(), module)
}

export async function getFreshModuleAccess(
  module: HeaderNavModule
): Promise<ModuleAccess> {
  try {
    const status = (await getStatus()) as Record<string, unknown> | null
    cacheStatus(status)
    return getModuleAccessFromStatus(status, module)
  } catch {
    return { enabled: false, requireAuth: true }
  }
}

export function isSidebarModuleEnabled(
  section: string,
  module: string
): boolean {
  const status = getCachedStatus()
  if (!status) return true

  const nestedData =
    status.data &&
    typeof status.data === 'object' &&
    !Array.isArray(status.data)
      ? (status.data as Record<string, unknown>)
      : null
  const raw = status.SidebarModulesAdmin ?? nestedData?.SidebarModulesAdmin
  if (!raw || String(raw).trim() === '') return true

  try {
    const parsed = JSON.parse(String(raw)) as Record<
      string,
      Record<string, boolean>
    >
    const sectionConfig = parsed[section]
    if (!sectionConfig) return true
    if (sectionConfig.enabled === false) return false
    if (sectionConfig[module] === false) return false
    return true
  } catch {
    return true
  }
}

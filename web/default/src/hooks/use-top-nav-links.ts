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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import {
  HEADER_NAV_BUILTIN_ITEMS,
  parseHeaderNavModulesFromStatus,
  type HeaderNavItem,
} from '@/lib/nav-modules'
import { useStatus } from '@/hooks/use-status'

export type TopNavLink = {
  title: string
  href: string
  action?: 'link' | 'modal'
  disabled?: boolean
  requiresAuth?: boolean
  external?: boolean
  modalTitle?: string
  modalContent?: string
}

/**
 * Generate top navigation links based on HeaderNavModules configuration from backend /api/status
 * Backend format example (stringified JSON):
 * {
 *   home: true,
 *   console: true,
 *   pricing: { enabled: true, requireAuth: false },
 *   rankings: { enabled: true, requireAuth: false },
 *   docs: true,
 *   about: true
 * }
 */
export function useTopNavLinks(): TopNavLink[] {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { auth } = useAuthStore()

  // Parse HeaderNavModules
  const modules = useMemo(() => {
    return parseHeaderNavModulesFromStatus(
      status as Record<string, unknown> | null
    )
  }, [status])

  // Documentation link (may be external)
  const docsLink: string | undefined = status?.docs_link as string | undefined

  const isAuthed = !!auth?.user

  const builtinFallback = new Map(
    HEADER_NAV_BUILTIN_ITEMS.map((item) => [item.id, item])
  )

  const resolveBuiltinHref = (item: HeaderNavItem): string => {
    if (item.id === 'docs') return docsLink || '/docs'
    return item.href || builtinFallback.get(item.id)?.href || '/'
  }

  return (modules.items || [])
    .filter((item) => item.enabled)
    .map<TopNavLink>((item) => {
      const fallback = builtinFallback.get(item.id)
      const title =
        item.type === 'builtin' && fallback && item.label === fallback.label
          ? t(fallback.label)
          : item.label || t(fallback?.label || item.id)
      if (item.type === 'modal') {
        return {
          title,
          href: '#',
          action: 'modal',
          modalTitle: item.modalTitle || title,
          modalContent: item.modalContent || '',
        }
      }

      const href =
        item.type === 'builtin' ? resolveBuiltinHref(item) : item.href || '/'
      const isDocsExternal = item.id === 'docs' && Boolean(docsLink)
      const requiresAuth =
        item.id === 'pricing'
          ? modules.pricing.requireAuth && !isAuthed
          : item.id === 'rankings'
            ? modules.rankings.requireAuth && !isAuthed
            : false

      return {
        title,
        href,
        action: 'link',
        external: item.type === 'link' ? item.external : isDocsExternal,
        requiresAuth,
      }
    })
}

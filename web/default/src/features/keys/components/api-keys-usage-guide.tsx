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
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { Markdown } from '@/components/ui/markdown'

export function ApiKeysUsageGuide() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const statusData =
    status?.data && typeof status.data === 'object' && !Array.isArray(status.data)
      ? status.data
      : null
  const content =
    typeof status?.keys_usage_guide === 'string'
      ? status.keys_usage_guide
      : typeof statusData?.keys_usage_guide === 'string'
        ? statusData.keys_usage_guide
        : ''
  const guide = content.trim()

  if (!guide) return null

  return (
    <section
      aria-label={t('API key usage guide')}
      className='bg-muted/20 text-card-foreground overflow-hidden rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3'
    >
      <Markdown>{guide}</Markdown>
    </section>
  )
}

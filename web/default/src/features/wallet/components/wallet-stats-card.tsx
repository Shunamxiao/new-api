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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AnimalIslandIcon,
  type AnimalIslandIconName,
} from '@/components/animal-island-icon'
import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()
  if (props.loading) {
    return (
      <div className='overflow-hidden rounded-lg border'>
        <div className='divide-border/60 grid grid-cols-3 divide-x'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='px-3 py-3 sm:px-5 sm:py-4'>
              <Skeleton className='h-3.5 w-20' />
              <Skeleton className='mt-2 h-7 w-28' />
              <Skeleton className='mt-1.5 h-3.5 w-24' />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.user?.quota ?? 0),
      description: t('Remaining quota'),
      icon: WalletCards,
      animalIcon: 'icon-shopping',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
      animalIcon: 'icon-miles',
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
      animalIcon: 'icon-diy',
    },
  ] satisfies Array<{
    label: string
    value: string
    description: string
    icon: typeof WalletCards
    animalIcon: AnimalIslandIconName
  }>

  return (
    <div data-wallet-scope='wallet-stats' className='overflow-hidden rounded-lg border'>
      <div className='divide-border/60 grid grid-cols-3 divide-x'>
        {stats.map((item) => (
          <div
            key={item.label}
            data-wallet-slot='stat-card'
            className='relative px-3 py-3 sm:px-5 sm:py-4'
          >
            <AnimalIslandIcon
              name={item.animalIcon}
              size={42}
              className='animal-wallet-watermark pointer-events-none absolute right-3 bottom-3 opacity-10'
            />
            <div className='flex items-center justify-between gap-2'>
              <div className='flex min-w-0 items-center gap-2'>
                <AnimalIslandIcon
                  name={item.animalIcon}
                  size={22}
                  className='animal-wallet-stat-icon shrink-0'
                  bounce
                />
                <div className='text-muted-foreground truncate text-xs font-medium tracking-wider uppercase'>
                  {item.label}
                </div>
              </div>
              <item.icon className='text-muted-foreground/45 size-3.5 shrink-0' />
            </div>

            <div
              data-wallet-slot='amount'
              className='text-foreground mt-1.5 font-mono text-base font-bold tracking-tight break-all tabular-nums sm:mt-2 sm:text-2xl'
            >
              {item.value}
            </div>
            <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

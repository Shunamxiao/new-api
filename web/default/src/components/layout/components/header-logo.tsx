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
import { useEffect, useState } from 'react'
import { AnimalIslandIcon } from '@/components/animal-island-icon'
import { Logo } from '@/assets/logo'
import { cn } from '@/lib/utils'

interface HeaderLogoProps {
  src: string
  alt?: string
  loading?: boolean
  logoLoaded?: boolean
  className?: string
  fallbackClassName?: string
}

/**
 * Logo component for header with loading state
 * Shows image only when fully loaded for smooth UX
 */
export function HeaderLogo({
  src,
  alt = 'logo',
  loading = false,
  logoLoaded = true,
  className,
  fallbackClassName,
}: HeaderLogoProps) {
  const [imageStatus, setImageStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'failed'
  >('idle')

  useEffect(() => {
    if (loading || !src) {
      setImageStatus('idle')
      return
    }

    let cancelled = false
    const image = new Image()

    setImageStatus('loading')
    image.onload = () => {
      if (!cancelled) setImageStatus('loaded')
    }
    image.onerror = () => {
      if (!cancelled) setImageStatus('failed')
    }
    image.src = src

    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
    }
  }, [loading, src])

  if (loading || !src || imageStatus !== 'loaded' || !logoLoaded) {
    return (
      <span
        aria-label={alt}
        role='img'
        data-slot='brand-logo-fallback'
        className={cn(
          'bg-primary/12 text-primary flex size-6 items-center justify-center rounded-full',
          className,
          fallbackClassName
        )}
      >
        <AnimalIslandIcon
          name='icon-map'
          size={18}
          className='animal-brand-logo-icon hidden'
        />
        <Logo className='default-brand-logo-icon size-4' />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImageStatus('failed')}
      className={cn(
        'h-6 w-6 rounded-full transition-opacity duration-200',
        className
      )}
    />
  )
}

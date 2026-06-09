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
import type { CSSProperties } from 'react'
import { Icon, type IconName } from 'animal-island-ui'
import { cn } from '@/lib/utils'

export type AnimalIslandIconName = IconName

interface AnimalIslandIconProps {
  name: AnimalIslandIconName
  size?: number
  className?: string
  style?: CSSProperties
  bounce?: boolean
}

export function AnimalIslandIcon(props: AnimalIslandIconProps) {
  const size = props.size ?? 24

  return (
    <Icon
      aria-hidden='true'
      data-animal-island-icon={props.name}
      name={props.name}
      size={size}
      bounce={props.bounce}
      className={cn(
        'inline-block shrink-0 object-contain',
        props.className
      )}
      style={props.style}
    />
  )
}

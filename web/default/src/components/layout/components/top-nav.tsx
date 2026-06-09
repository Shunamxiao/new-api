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
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Markdown } from '@/components/ui/markdown'
import { type TopNavLink } from '../types'

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: TopNavLink[]
}

/**
 * 顶部导航栏组件
 * 在大屏幕显示水平导航，在小屏幕显示下拉菜单
 */
export function TopNav({ className, links, ...props }: TopNavProps) {
  const [modalLink, setModalLink] = useState<TopNavLink | null>(null)

  // 规范化链接，确保所有可选属性都有默认值
  const normalizedLinks = useMemo(
    () =>
      links.map((link) => ({
        isActive: false,
        disabled: false,
        external: false,
        ...link,
      })),
    [links]
  )

  return (
    <>
      {/* 移动端下拉菜单 */}
      <div className='lg:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            render={<Button size='icon' variant='outline' className='size-7' />}
          >
            <Menu />
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {normalizedLinks.map((link) => {
              const { title, href, isActive, disabled, external } = link
              if (link.action === 'modal') {
                return (
                  <DropdownMenuItem
                    key={`${title}-${href}`}
                    disabled={disabled}
                    onClick={() => setModalLink(link)}
                  >
                    <span className={!isActive ? 'text-muted-foreground' : ''}>
                      {title}
                    </span>
                  </DropdownMenuItem>
                )
              }

              return (
                <DropdownMenuItem
                  key={`${title}-${href}`}
                  render={
                    external ? (
                      <a
                        href={href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={!isActive ? 'text-muted-foreground' : ''}
                      >
                        {title}
                      </a>
                    ) : (
                      <Link
                        to={href}
                        className={!isActive ? 'text-muted-foreground' : ''}
                        disabled={disabled}
                      >
                        {title}
                      </Link>
                    )
                  }
                ></DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 桌面端水平导航 */}
      <nav
        className={cn(
          'hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6',
          className
        )}
        {...props}
      >
        {normalizedLinks.map((link) => {
          const { title, href, isActive, disabled, external } = link
          const linkClassName = `hover:text-primary text-sm font-medium transition-colors ${isActive ? '' : 'text-muted-foreground'}`

          if (link.action === 'modal') {
            return (
              <button
                key={`${title}-${href}`}
                type='button'
                disabled={disabled}
                onClick={() => setModalLink(link)}
                className={linkClassName}
              >
                {title}
              </button>
            )
          }

          return external ? (
            <a
              key={`${title}-${href}`}
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className={linkClassName}
            >
              {title}
            </a>
          ) : (
            <Link
              key={`${title}-${href}`}
              to={href}
              disabled={disabled}
              className={linkClassName}
            >
              {title}
            </Link>
          )
        })}
      </nav>

      <Dialog
        open={!!modalLink}
        onOpenChange={(open) => !open && setModalLink(null)}
      >
        <DialogContent className='max-h-[88dvh] w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-2xl'>
          <DialogHeader className='border-border border-b px-5 py-4 text-left'>
            <DialogTitle>
              {modalLink?.modalTitle || modalLink?.title}
            </DialogTitle>
          </DialogHeader>
          <div className='max-h-[calc(88dvh-5rem)] overflow-y-auto px-5 py-4'>
            <Markdown>{modalLink?.modalContent || ''}</Markdown>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

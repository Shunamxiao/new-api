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
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Copy,
  ImageIcon,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'
import { useStatus } from '@/hooks/use-status'
import {
  getDefaultApiBaseUrl,
  parseHomeContactConfig,
} from '../../contact-config'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

const FIREFLIES = [
  { left: '8%', bottom: '16%', x1: '6px', x2: '19px', x3: '29px', x4: '34px', delay: '0s', duration: '5.8s' },
  { left: '18%', bottom: '12%', x1: '-4px', x2: '-12px', x3: '-19px', x4: '-22px', delay: '0.7s', duration: '6.4s' },
  { left: '31%', bottom: '18%', x1: '5px', x2: '15px', x3: '24px', x4: '28px', delay: '1.4s', duration: '5.6s' },
  { left: '46%', bottom: '13%', x1: '-6px', x2: '-20px', x3: '-31px', x4: '-36px', delay: '0.3s', duration: '6.1s' },
  { left: '62%', bottom: '19%', x1: '4px', x2: '13px', x3: '20px', x4: '24px', delay: '1.9s', duration: '5.9s' },
  { left: '77%', bottom: '12%', x1: '-5px', x2: '-17px', x3: '-26px', x4: '-30px', delay: '1.1s', duration: '6.7s' },
  { left: '89%', bottom: '17%', x1: '4px', x2: '11px', x3: '17px', x4: '20px', delay: '2.2s', duration: '5.7s' },
  { left: '54%', bottom: '9%', x1: '-5px', x2: '-14px', x3: '-22px', x4: '-26px', delay: '2.8s', duration: '6.3s' },
  { left: '25%', bottom: '8%', x1: '8px', x2: '23px', x3: '36px', x4: '42px', delay: '3.2s', duration: '6.8s' },
  { left: '70%', bottom: '8%', x1: '-8px', x2: '-24px', x3: '-37px', x4: '-44px', delay: '3.7s', duration: '6.2s' },
] as const

function FireflyField() {
  return (
    <div
      aria-hidden
      className='pointer-events-none absolute inset-0 z-0 hidden overflow-hidden dark:block'
    >
      <style>
        {`
          @keyframes home-firefly-float {
            0% { opacity: 0; transform: translate3d(0, 24px, 0) scale(.55); }
            8% { opacity: .45; transform: translate3d(0, 0, 0) scale(.95); }
            18% { opacity: 1; transform: translate3d(var(--firefly-x1), -54px, 0) scale(1.65); }
            38% { opacity: .95; transform: translate3d(var(--firefly-x2), -132px, 0) scale(1.18); }
            68% { opacity: .55; transform: translate3d(var(--firefly-x3), -214px, 0) scale(.82); }
            100% { opacity: 0; transform: translate3d(var(--firefly-x4), -296px, 0) scale(.42); }
          }
          @keyframes home-firefly-tail {
            0%, 12% { opacity: 0; transform: scaleY(.2); }
            22% { opacity: .7; transform: scaleY(1); }
            70%, 100% { opacity: 0; transform: scaleY(.35); }
          }
          @media (prefers-reduced-motion: reduce) {
            .home-firefly,
            .home-firefly::after {
              animation: none !important;
            }
          }
        `}
      </style>
      {FIREFLIES.map((firefly, index) => (
        <span
          key={index}
          className='home-firefly absolute size-3 rounded-full bg-cyan-100 shadow-[0_0_22px_rgba(186,230,253,1),0_0_48px_rgba(45,212,191,0.95),0_0_76px_rgba(59,130,246,0.55)] after:absolute after:left-1/2 after:top-full after:h-20 after:w-px after:-translate-x-1/2 after:origin-top after:rounded-full after:bg-gradient-to-b after:from-cyan-100/90 after:via-cyan-300/45 after:to-transparent after:content-[""] after:[animation:var(--tail-animation)]'
          style={{
            left: firefly.left,
            bottom: firefly.bottom,
            ['--firefly-x1' as string]: firefly.x1,
            ['--firefly-x2' as string]: firefly.x2,
            ['--firefly-x3' as string]: firefly.x3,
            ['--firefly-x4' as string]: firefly.x4,
            animation: `home-firefly-float ${firefly.duration} ease-in-out ${firefly.delay} infinite`,
            ['--tail-animation' as string]: `home-firefly-tail ${firefly.duration} ease-in-out ${firefly.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url)
}

function ActionLink(props: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={props.href}
      target={isExternalUrl(props.href) ? '_blank' : undefined}
      rel={isExternalUrl(props.href) ? 'noopener noreferrer' : undefined}
      className={props.className}
    >
      {props.children}
    </a>
  )
}

function HomeGatewayPanel(props: { isAuthenticated?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const config = parseHomeContactConfig(status?.home_contact_config, {
    apiBaseUrl: getDefaultApiBaseUrl(status?.server_address as string),
  })
  const consoleHref = props.isAuthenticated ? '/dashboard/overview' : '/sign-in'
  const contactHref = config.contactUrl || config.rechargeUrl || consoleHref
  const actions = [
    {
      label: t('Dashboard'),
      href: consoleHref,
      icon: ArrowRight,
    },
    {
      label: t('Get Started'),
      href: config.docsUrl,
      icon: Sparkles,
    },
    {
      label: t('Image Generation'),
      href: config.imageGenerationUrl || '/mj',
      icon: ImageIcon,
    },
    {
      label: t('Contact Us'),
      href: contactHref,
      icon: MessageCircle,
    },
  ]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(config.apiBaseUrl)
      toast.success(t('API Base URL copied'))
    } catch {
      toast.error(t('Copy failed'))
    }
  }

  return (
    <div className='relative z-10 mx-auto mt-12 max-w-4xl rounded-lg border border-border/60 bg-background/70 p-4 text-left shadow-[0_26px_80px_-56px_rgba(15,23,42,0.7)] backdrop-blur-md md:p-5 dark:border-cyan-300/15 dark:bg-slate-950/45 dark:shadow-[0_26px_100px_-58px_rgba(56,189,248,0.75)]'>
      <div className='pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(135deg,rgba(125,211,252,0.16),transparent_30%,rgba(168,85,247,0.12))] opacity-80' />
      <div className='relative grid gap-4 lg:grid-cols-[1.35fr_1fr]'>
        <div className='rounded-lg border border-border/50 bg-muted/20 p-4 dark:border-cyan-300/12 dark:bg-slate-950/40'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div>
              <div className='text-muted-foreground text-xs font-medium tracking-widest uppercase'>
                {t('API Base URL')}
              </div>
              <div className='mt-2 font-mono text-base font-semibold break-all text-foreground md:text-lg'>
                {config.apiBaseUrl}
              </div>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='shrink-0'
              onClick={handleCopy}
            >
              <Copy className='size-3.5' />
              {t('Copy')}
            </Button>
          </div>
          <div className='inline-flex rounded-md border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 font-mono text-sm text-cyan-700 dark:text-cyan-100'>
            {config.apiEndpoint}
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <ActionLink
                key={action.label}
                href={action.href}
                className='group flex min-h-20 items-center gap-3 rounded-lg border border-border/50 bg-background/55 px-4 py-3 text-sm font-medium transition-colors hover:border-cyan-300/40 hover:bg-cyan-300/8 dark:border-cyan-300/12 dark:bg-slate-950/35'
              >
                <span className='flex size-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-700 transition-colors group-hover:bg-cyan-300/18 dark:text-cyan-100'>
                  <Icon className='size-4' />
                </span>
                <span>{action.label}</span>
              </ActionLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 min-h-56 overflow-hidden px-6 py-20 md:py-28'>
      <FireflyField />
      {/* Gradient mesh background */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 opacity-20 dark:opacity-[0.08]'
        style={{
          background: [
            'radial-gradient(ellipse 50% 50% at 30% 50%, oklch(0.7 0.15 250 / 70%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 40% at 70% 40%, oklch(0.65 0.12 200 / 50%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />

      <AnimateInView
        className='relative z-10 mx-auto max-w-2xl text-center'
        animation='scale-in'
      >
        <h2 className='text-2xl leading-tight font-bold tracking-tight md:text-4xl'>
          {t('Ready to simplify')}
          <br />
          <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
            {t('your AI integration?')}
          </span>
        </h2>
        <p className='text-muted-foreground/80 mx-auto mt-5 max-w-md text-sm leading-relaxed md:text-base'>
          {t(
            'Deploy your own gateway and start routing requests through your configured upstream services.'
          )}
        </p>
        <div className='mt-8 flex items-center justify-center gap-3'>
          <Button
            className='group rounded-lg'
            render={
              <Link
                to={
                  props.isAuthenticated ? '/dashboard/overview' : '/sign-up'
                }
              />
            }
          >
            {props.isAuthenticated ? t('Dashboard') : t('Get Started')}
            <ArrowRight className='ml-1 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5' />
          </Button>
          <Button
            variant='outline'
            className='border-border/50 hover:border-border hover:bg-muted/50 rounded-lg'
            render={<Link to='/pricing' />}
          >
            {t('View Pricing')}
          </Button>
        </div>
        <HomeGatewayPanel isAuthenticated={props.isAuthenticated} />
      </AnimateInView>
    </section>
  )
}

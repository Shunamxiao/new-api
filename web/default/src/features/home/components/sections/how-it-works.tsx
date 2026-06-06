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
import { useEffect, useRef, useState } from 'react'
import { Settings, Zap, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'
import { cn } from '@/lib/utils'

const STEP_ORIGINS = [
  '-translate-x-20 -translate-y-14 rotate-[-6deg]',
  'translate-y-24 scale-90',
  'translate-x-20 -translate-y-14 rotate-[6deg]',
] as const

export function HowItWorks() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setSettled(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSettled(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.32, rootMargin: '0px 0px -80px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const steps = [
    {
      num: '1',
      title: t('Configure'),
      desc: t(
        'Add your API keys, set up channels and configure access permissions'
      ),
      icon: <Settings className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '2',
      title: t('Connect'),
      desc: t(
        'Connect through OpenAI, Claude, Gemini, and other compatible API routes'
      ),
      icon: <Zap className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '3',
      title: t('Monitor'),
      desc: t('Track usage, costs and performance with real-time analytics'),
      icon: <BarChart3 className='size-6' strokeWidth={1.5} />,
    },
  ]

  return (
    <section
      ref={sectionRef}
      className='border-border/40 relative z-10 overflow-hidden border-t px-6 py-20 md:py-24'
    >
      <style>
        {`
          @keyframes home-flow-pulse {
            0%, 100% { opacity: .18; transform: scaleX(.88); }
            45% { opacity: .9; transform: scaleX(1); }
          }
          @keyframes home-flow-orbit {
            0%, 100% { transform: translate3d(-10px, 0, 0); opacity: .35; }
            50% { transform: translate3d(10px, -8px, 0); opacity: .95; }
          }
          @keyframes home-flow-sweep {
            0% { opacity: 0; transform: translateX(-40%); }
            18%, 55% { opacity: .75; }
            100% { opacity: 0; transform: translateX(140%); }
          }
          @media (prefers-reduced-motion: reduce) {
            .home-flow-pulse,
            .home-flow-orbit,
            .home-flow-sweep {
              animation: none !important;
            }
          }
        `}
      </style>

      <div
        aria-hidden
        className='absolute inset-0 -z-10 hidden dark:block'
      >
        <div className='absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent' />
        <div className='absolute inset-x-[8%] top-14 bottom-14 rounded-lg border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(8,47,73,0.12),rgba(15,23,42,0.02))]' />
        <div className='absolute top-[28%] left-1/2 h-72 w-[58rem] -translate-x-1/2 rounded-full border border-cyan-300/10 bg-cyan-300/5 blur-3xl' />
        <div className='absolute right-[12%] bottom-[18%] h-32 w-72 rounded-full border border-violet-300/10 bg-violet-300/10 blur-2xl' />
      </div>

      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mx-auto mb-10 max-w-4xl text-center md:mb-12'>
          <div className='mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/5 px-3 py-1.5 text-xs font-medium tracking-widest text-cyan-700 uppercase dark:text-cyan-200'>
            <span className='size-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]' />
            {t('How It Works')}
          </div>
          <h2 className='text-3xl leading-tight font-bold tracking-tight md:text-5xl'>
            {t('Three steps to get started')}
          </h2>
          <div className='mx-auto mt-5 h-px w-72 bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent' />
        </AnimateInView>

        <div className='relative rounded-lg border border-border/50 bg-background/45 p-4 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.6)] backdrop-blur-sm md:p-6 dark:border-cyan-300/10 dark:bg-slate-950/20 dark:shadow-[0_30px_120px_-65px_rgba(56,189,248,0.6)]'>
          <div
            aria-hidden
            className='home-flow-pulse pointer-events-none absolute top-[5rem] left-[18%] hidden h-px w-[64%] origin-center bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent md:block'
            style={{ animation: 'home-flow-pulse 4.8s ease-in-out infinite' }}
          />
          <div
            aria-hidden
            className='home-flow-sweep pointer-events-none absolute top-[4.95rem] left-[16%] hidden h-px w-28 bg-gradient-to-r from-transparent via-white/80 to-transparent md:block'
            style={{ animation: 'home-flow-sweep 5.6s ease-in-out infinite' }}
          />

          <div className='grid gap-5 md:grid-cols-3 md:gap-6'>
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={cn(
                  'relative flex flex-col items-center text-center transition-[opacity,transform,filter] duration-1000 ease-out',
                  settled
                    ? 'translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100 blur-0'
                    : `${STEP_ORIGINS[i]} opacity-0 blur-sm`
                )}
                style={{ transitionDelay: settled ? `${i * 140}ms` : '0ms' }}
              >
                <div className='group border-border/50 bg-background/80 relative min-h-[230px] w-full rounded-lg border p-6 shadow-[0_22px_55px_-36px_rgba(15,23,42,0.5)] backdrop-blur-md transition-colors dark:border-cyan-300/14 dark:bg-slate-950/45 dark:shadow-[0_24px_70px_-40px_rgba(56,189,248,0.65)]'>
                  <div className='pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(135deg,rgba(125,211,252,0.20),transparent_26%,transparent_70%,rgba(168,85,247,0.16))] opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:opacity-70' />
                  <div className='absolute top-0 left-8 h-px w-20 bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent' />
                  <div className='absolute right-8 bottom-0 h-px w-20 bg-gradient-to-r from-transparent via-violet-300/80 to-transparent' />
                  <div className='absolute top-5 right-5 text-[10px] font-semibold tracking-[0.24em] text-cyan-700/50 dark:text-cyan-200/45'>
                    0{step.num}
                  </div>

                  <div className='relative mx-auto mb-5 w-fit'>
                    <div className='text-muted-foreground border-border/50 bg-muted/30 flex size-20 items-center justify-center rounded-lg border transition-colors dark:border-cyan-300/24 dark:bg-cyan-300/7 dark:text-cyan-100'>
                      {step.icon}
                    </div>
                    <div
                      className='home-flow-orbit absolute -inset-3 rounded-xl border border-cyan-300/24 opacity-70'
                      style={{
                        animation: `home-flow-orbit ${4.2 + i * 0.4}s ease-in-out ${i * 0.35}s infinite`,
                      }}
                    />
                    <div className='absolute -right-2 -bottom-2 size-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]' />
                  </div>

                  <h3 className='relative mb-3 text-lg font-semibold'>
                    {step.title}
                  </h3>
                  <p className='text-muted-foreground relative mx-auto max-w-[250px] text-sm leading-relaxed'>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

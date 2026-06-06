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
const COSMIC_STARS = [
  { left: '8%', top: '8%', size: 2, delay: '0s', duration: '4.2s' },
  { left: '17%', top: '24%', size: 1, delay: '1.6s', duration: '5.4s' },
  { left: '28%', top: '12%', size: 1, delay: '0.7s', duration: '4.8s' },
  { left: '35%', top: '36%', size: 2, delay: '2.4s', duration: '5.8s' },
  { left: '48%', top: '18%', size: 1, delay: '1.1s', duration: '4.6s' },
  { left: '58%', top: '48%', size: 2, delay: '3.1s', duration: '6.2s' },
  { left: '66%', top: '14%', size: 1, delay: '0.4s', duration: '4.4s' },
  { left: '74%', top: '38%', size: 2, delay: '2.1s', duration: '5.6s' },
  { left: '83%', top: '22%', size: 1, delay: '1.9s', duration: '5s' },
  { left: '91%', top: '44%', size: 2, delay: '0.9s', duration: '6s' },
  { left: '12%', top: '58%', size: 1, delay: '3.6s', duration: '5.2s' },
  { left: '43%', top: '64%', size: 1, delay: '2.8s', duration: '4.9s' },
  { left: '5%', top: '78%', size: 1, delay: '1.3s', duration: '3.8s' },
  { left: '22%', top: '72%', size: 2, delay: '2.6s', duration: '4.1s' },
  { left: '31%', top: '86%', size: 1, delay: '0.2s', duration: '3.6s' },
  { left: '52%', top: '76%', size: 1, delay: '3.3s', duration: '4.3s' },
  { left: '69%', top: '84%', size: 1, delay: '1.7s', duration: '3.9s' },
  { left: '88%', top: '72%', size: 2, delay: '2.9s', duration: '4.7s' },
  { left: '95%', top: '62%', size: 1, delay: '0.6s', duration: '3.7s' },
  { left: '39%', top: '92%', size: 2, delay: '1.5s', duration: '4.5s' },
  { left: '14%', top: '43%', size: 1, delay: '0.8s', duration: '4.2s' },
  { left: '57%', top: '9%', size: 2, delay: '2.2s', duration: '5.1s' },
  { left: '78%', top: '92%', size: 1, delay: '3.4s', duration: '4.6s' },
  { left: '3%', top: '34%', size: 2, delay: '2.7s', duration: '5.7s' },
] as const

const COSMIC_METEORS = [
  { left: '10%', top: '6%', delay: '0.5s', duration: '7.5s' },
  { left: '48%', top: '12%', delay: '3.2s', duration: '8.8s' },
  { left: '78%', top: '26%', delay: '5.8s', duration: '9.5s' },
  { left: '62%', top: '58%', delay: '7.1s', duration: '10.2s' },
] as const

const TOP_PLANET_SPARKS = [
  { left: '12%', top: '24%', size: 3, x: '-16px', y: '-20px', delay: '0s', duration: '3.8s' },
  { left: '76%', top: '18%', size: 2, x: '18px', y: '-18px', delay: '0.7s', duration: '4.2s' },
  { left: '86%', top: '56%', size: 3, x: '20px', y: '12px', delay: '1.2s', duration: '3.6s' },
  { left: '24%', top: '78%', size: 2, x: '-14px', y: '18px', delay: '1.8s', duration: '4.4s' },
  { left: '48%', top: '8%', size: 2, x: '4px', y: '-24px', delay: '2.1s', duration: '3.9s' },
  { left: '4%', top: '54%', size: 2, x: '-22px', y: '6px', delay: '2.6s', duration: '4.6s' },
] as const

const TOP_PLANET_IMAGE =
  'https://img.pagehost.cn/autoupload/RUB1VzuZ7lHwdpWkZlkFCtiO_OyvX7mIgxFBfDMDErs/20260606/9BDt/512X512/TheWorldTop.png/webp'

export function HomeCosmicBackground() {
  return (
    <div
      aria-hidden
      className='pointer-events-none absolute inset-0 hidden overflow-hidden dark:block'
    >
      <style>
        {`
          @keyframes home-cosmic-drift {
            0%, 100% { opacity: .16; transform: translate3d(0, 0, 0) scale(.8); }
            35% { opacity: 1; transform: translate3d(6px, -8px, 0) scale(1.9); }
            58% { opacity: .44; transform: translate3d(11px, -12px, 0) scale(1.12); }
          }
          @keyframes home-cosmic-meteor {
            0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(135deg); }
            10% { opacity: .95; }
            24% { opacity: 0; transform: translate3d(-440px, 440px, 0) rotate(135deg); }
            100% { opacity: 0; transform: translate3d(-440px, 440px, 0) rotate(135deg); }
          }
          @keyframes home-cosmic-scan {
            0%, 100% { transform: translateY(-12%); opacity: .16; }
            50% { transform: translateY(18%); opacity: .32; }
          }
          @keyframes home-planet-drift {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
            50% { transform: translate3d(18px, -22px, 0) rotate(5deg); }
          }
          @keyframes home-planet-spark {
            0%, 100% { opacity: .18; transform: translate3d(0, 0, 0) scale(.75); }
            42% { opacity: 1; transform: translate3d(var(--spark-x), var(--spark-y), 0) scale(1.55); }
            70% { opacity: .48; transform: translate3d(calc(var(--spark-x) * .62), calc(var(--spark-y) * .62), 0) scale(.95); }
          }
          @keyframes home-planet-halo {
            0%, 100% { opacity: .38; transform: scale(.92) rotate(0deg); }
            50% { opacity: .78; transform: scale(1.08) rotate(8deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .home-cosmic-star,
            .home-cosmic-meteor,
            .home-cosmic-scan,
            .home-cosmic-planet,
            .home-planet-spark,
            .home-planet-halo {
              animation: none !important;
            }
          }
        `}
      </style>

      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_78%_32%,rgba(168,85,247,0.18),transparent_24%),radial-gradient(circle_at_18%_72%,rgba(20,184,166,0.12),transparent_24%)]' />
      <div className='absolute inset-0 opacity-70 [background-image:radial-gradient(ellipse_at_18%_28%,rgba(125,211,252,0.24)_0%,transparent_24%),radial-gradient(ellipse_at_62%_20%,rgba(196,181,253,0.22)_0%,transparent_28%),radial-gradient(ellipse_at_82%_70%,rgba(45,212,191,0.16)_0%,transparent_22%)] blur-2xl' />
      <div className='absolute inset-x-[-18%] top-[18%] h-44 -rotate-6 bg-[radial-gradient(ellipse_at_center,rgba(186,230,253,0.24)_0%,rgba(129,140,248,0.13)_34%,transparent_70%)] blur-xl' />
      <div className='absolute inset-x-[-20%] top-[58%] h-52 rotate-3 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.14)_0%,rgba(56,189,248,0.09)_34%,transparent_72%)] blur-2xl' />
      <div className='absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(125,211,252,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.07)_1px,transparent_1px)] [background-size:76px_76px] [mask-image:linear-gradient(to_bottom,black,rgba(0,0,0,0.55),black)]' />
      <div
        className='home-cosmic-scan absolute top-1/4 left-0 h-24 w-full bg-gradient-to-b from-transparent via-cyan-300/8 to-transparent blur-xl'
        style={{ animation: 'home-cosmic-scan 9s ease-in-out infinite' }}
      />

      <div
        className='home-cosmic-planet absolute top-[13%] right-[7%] size-32 opacity-85 md:size-36'
        style={{ animation: 'home-planet-drift 18s ease-in-out infinite' }}
      >
        <span className='absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.34)_0%,rgba(59,130,246,0.16)_35%,transparent_72%)] blur-xl' />
        <span
          className='home-planet-halo absolute -inset-5 rounded-full border border-cyan-100/20 shadow-[0_0_42px_rgba(56,189,248,0.28),inset_0_0_34px_rgba(125,211,252,0.12)]'
          style={{ animation: 'home-planet-halo 6.8s ease-in-out infinite' }}
        />
        <span className='absolute top-1/2 left-1/2 h-9 w-52 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border border-cyan-100/18 bg-gradient-to-r from-transparent via-cyan-100/8 to-transparent blur-[1px]' />
        <img
          src={TOP_PLANET_IMAGE}
          alt=''
          draggable={false}
          loading='eager'
          decoding='async'
          className='relative size-full object-contain drop-shadow-[0_0_42px_rgba(56,189,248,0.55)]'
        />
        {TOP_PLANET_SPARKS.map((spark, index) => (
          <span
            key={index}
            className='home-planet-spark absolute rounded-full bg-cyan-100 shadow-[0_0_14px_rgba(186,230,253,1),0_0_30px_rgba(56,189,248,0.75)]'
            style={{
              left: spark.left,
              top: spark.top,
              width: spark.size,
              height: spark.size,
              ['--spark-x' as string]: spark.x,
              ['--spark-y' as string]: spark.y,
              animation: `home-planet-spark ${spark.duration} ease-in-out ${spark.delay} infinite`,
            }}
          />
        ))}
      </div>
      <div
        className='home-cosmic-planet absolute top-[62%] left-[7%] size-20 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.8),rgba(196,181,253,0.34)_22%,rgba(109,40,217,0.18)_56%,rgba(15,23,42,0.08)_76%)] opacity-45 shadow-[0_0_60px_rgba(168,85,247,0.35)]'
        style={{
          animation: 'home-planet-drift 22s ease-in-out 2.5s infinite',
        }}
      />

      {COSMIC_STARS.map((star, index) => (
        <span
          key={index}
          className='home-cosmic-star absolute rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(125,211,252,0.95)]'
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animation: `home-cosmic-drift ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}

      {COSMIC_METEORS.map((meteor, index) => (
        <span
          key={index}
          className='home-cosmic-meteor absolute h-px w-40 origin-left rounded-full bg-gradient-to-r from-cyan-100 via-sky-300/90 to-transparent shadow-[0_0_18px_rgba(56,189,248,0.85)]'
          style={{
            left: meteor.left,
            top: meteor.top,
            animation: `home-cosmic-meteor ${meteor.duration} linear ${meteor.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}

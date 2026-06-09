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
import * as z from 'zod'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_THEME_CUSTOMIZATION,
  THEME_PRESET_VALUES,
  type ThemePreset,
} from '@/lib/theme-customization'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormDirtyIndicator } from '../components/form-dirty-indicator'
import { FormNavigationGuard } from '../components/form-navigation-guard'
import {
  SettingsForm,
  SettingsFormGrid,
  SettingsFormGridItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useSettingsForm } from '../hooks/use-settings-form'
import { useUpdateOption } from '../hooks/use-update-option'

const _systemInfoSchema = z.object({
  theme: z.object({
    frontend: z.enum(['default', 'classic', 'animal-island']),
    preset: z.string(),
  }),
  SystemName: z.string().min(1),
  ServerAddress: z.string().optional(),
  Logo: z.string().url().optional().or(z.literal('')),
  Footer: z.string().optional(),
  About: z.string().optional(),
  HomePageContent: z.string().optional(),
  HomeHeroBadge: z.string().optional(),
  HomeHeroTitle: z.string().optional(),
  HomeHeroHighlight: z.string().optional(),
  HomeHeroDescription: z.string().optional(),
  legal: z.object({
    user_agreement: z.string().optional(),
    privacy_policy: z.string().optional(),
  }),
})

type SystemInfoFormValues = z.infer<typeof _systemInfoSchema>

type SystemInfoSectionProps = {
  defaultValues: SystemInfoFormValues
}

export type FrontendThemeValue = 'default' | 'classic' | 'animal-island'

const FRONTEND_THEME_OPTIONS: Array<{
  value: FrontendThemeValue
  labelKey: string
}> = [
  {
    value: 'default',
    labelKey: 'Default (New Frontend)',
  },
  {
    value: 'animal-island',
    labelKey: 'Animal Island Theme',
  },
  {
    value: 'classic',
    labelKey: 'Classic (Legacy Frontend)',
  },
]

const FRONTEND_THEME_VALUES = new Set<FrontendThemeValue>(
  FRONTEND_THEME_OPTIONS.map((item) => item.value)
)

function normalizeFrontendTheme(value: unknown): FrontendThemeValue {
  if (
    typeof value === 'string' &&
    FRONTEND_THEME_VALUES.has(value as FrontendThemeValue)
  ) {
    return value as FrontendThemeValue
  }
  return 'default'
}

function normalizeValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

export function SystemInfoSection({ defaultValues }: SystemInfoSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const savedPreset =
    defaultValues.theme?.preset &&
    THEME_PRESET_VALUES.has(defaultValues.theme.preset as ThemePreset)
      ? (defaultValues.theme.preset as ThemePreset)
      : DEFAULT_THEME_CUSTOMIZATION.preset
  const frontendThemeValue: FrontendThemeValue = normalizeFrontendTheme(
    savedPreset === 'animal-island'
      ? 'animal-island'
      : defaultValues.theme?.frontend
  )

  const normalizedDefaults: SystemInfoFormValues = {
    theme: {
      frontend: frontendThemeValue,
      preset: savedPreset,
    },
    SystemName: normalizeValue(defaultValues.SystemName),
    ServerAddress: normalizeValue(defaultValues.ServerAddress),
    Logo: normalizeValue(defaultValues.Logo),
    Footer: normalizeValue(defaultValues.Footer),
    About: normalizeValue(defaultValues.About),
    HomePageContent: normalizeValue(defaultValues.HomePageContent),
    HomeHeroBadge: normalizeValue(defaultValues.HomeHeroBadge),
    HomeHeroTitle: normalizeValue(defaultValues.HomeHeroTitle),
    HomeHeroHighlight: normalizeValue(defaultValues.HomeHeroHighlight),
    HomeHeroDescription: normalizeValue(defaultValues.HomeHeroDescription),
    legal: {
      user_agreement: normalizeValue(defaultValues.legal?.user_agreement),
      privacy_policy: normalizeValue(defaultValues.legal?.privacy_policy),
    },
  }

  const systemInfoSchemaWithI18n = z.object({
    theme: z.object({
      frontend: z.enum(['default', 'classic', 'animal-island']),
      preset: z.string(),
    }),
    SystemName: z.string().min(1, {
      error: () => t('System name is required'),
    }),
    ServerAddress: z.string().optional(),
    Logo: z.string().url().optional().or(z.literal('')),
    Footer: z.string().optional(),
    About: z.string().optional(),
    HomePageContent: z.string().optional(),
    HomeHeroBadge: z.string().optional(),
    HomeHeroTitle: z.string().optional(),
    HomeHeroHighlight: z.string().optional(),
    HomeHeroDescription: z.string().optional(),
    legal: z.object({
      user_agreement: z.string().optional(),
      privacy_policy: z.string().optional(),
    }),
  })

  const { form, handleSubmit, handleReset, isDirty, isSubmitting } =
    useSettingsForm<SystemInfoFormValues>({
      resolver: zodResolver(systemInfoSchemaWithI18n) as Resolver<
        SystemInfoFormValues,
        unknown,
        SystemInfoFormValues
      >,
      defaultValues: normalizedDefaults,
      onSubmit: async (_data, changedFields) => {
        for (const [key, value] of Object.entries(changedFields)) {
          let v = normalizeValue(value)
          if (key === 'theme.frontend') {
            const selectedFrontend = normalizeFrontendTheme(v)
            const preset =
              selectedFrontend === 'animal-island'
                ? 'animal-island'
                : 'default'
            const frontend =
              selectedFrontend === 'classic' ? 'classic' : 'default'
            await updateOption.mutateAsync({
              key: 'theme.frontend',
              value: frontend,
            })
            await updateOption.mutateAsync({
              key: 'theme.preset',
              value: preset,
            })
            continue
          }
          if (key === 'ServerAddress') {
            v = v.replace(/\/+$/, '')
          }
          await updateOption.mutateAsync({
            key,
            value: v,
          })
        }
      },
    })

  return (
    <>
      <FormNavigationGuard when={isDirty} />

      <SettingsSection title={t('System Information')}>
        <Form {...form}>
          <SettingsForm onSubmit={handleSubmit}>
            <SettingsPageFormActions
              onSave={handleSubmit}
              onReset={handleReset}
              isSaving={isSubmitting || updateOption.isPending}
              isResetDisabled={!isDirty}
            />
            <FormDirtyIndicator isDirty={isDirty} />
            <SettingsFormGrid>
              <FormField
                control={form.control}
                name='theme.frontend'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Frontend Theme')}</FormLabel>
                    <Select
                      items={FRONTEND_THEME_OPTIONS.map((item) => ({
                        value: item.value,
                        label: t(item.labelKey),
                      }))}
                      onValueChange={field.onChange}
                      value={normalizeFrontendTheme(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {FRONTEND_THEME_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {t(item.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t(
                        'Switch the frontend version or apply a global display theme. Changes take effect after page reload.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='SystemName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('System Name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('New API')} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('The name displayed across the application')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='ServerAddress'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Server Address')}</FormLabel>
                    <FormControl>
                      <Input placeholder='https://yourdomain.com' {...field} />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'The public URL of your server, used for OAuth callbacks, webhooks, and other external integrations'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='Logo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Logo URL')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('https://example.com/logo.png')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('URL to your logo image (optional)')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='Footer'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Footer')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          '© 2025 Your Company. All rights reserved.'
                        )}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('Footer text displayed at the bottom of pages')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='About'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('About')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          'Enter HTML code (e.g., <p>About us...</p>) or a URL (e.g., https://example.com) to embed as iframe'
                        )}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Supports HTML markup or iframe embedding. Enter HTML code directly, or provide a complete URL to automatically embed it as an iframe.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SettingsFormGridItem span='full'>
                <div className='border-border/60 bg-muted/20 rounded-lg border p-4'>
                  <div className='mb-4 space-y-1'>
                    <h3 className='text-sm font-medium'>
                      {t('Home Hero Copy')}
                    </h3>
                    <p className='text-muted-foreground text-sm'>
                      {t(
                        'Configure the default home page headline copy without replacing the full home page.'
                      )}
                    </p>
                  </div>

                  <SettingsFormGrid>
                    <FormField
                      control={form.control}
                      name='HomeHeroBadge'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Hero Badge')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('Powered by New API')}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('Small label above the home page headline')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='HomeHeroTitle'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Hero Title')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('Unified API Gateway for')}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('First line of the home page headline')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='HomeHeroHighlight'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Hero Highlight')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('Vast Range of AI Models')}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('Highlighted second line of the headline')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='HomeHeroDescription'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Hero Description')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t(
                                'Access a vast selection of models via a standard, unified API protocol. Power AI applications, manage digital assets, and connect the Future.'
                              )}
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('Description below the home page headline')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SettingsFormGrid>
                </div>
              </SettingsFormGridItem>

              <SettingsFormGridItem span='full'>
                <FormField
                  control={form.control}
                  name='HomePageContent'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Home Page Content')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('Welcome to our New API...')}
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Advanced custom home page content. When filled, it replaces the default home page and supports a full URL, HTML, or Markdown.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SettingsFormGridItem>

              <FormField
                control={form.control}
                name='legal.user_agreement'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('User Agreement')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          'Provide Markdown, HTML, or an external URL for the user agreement'
                        )}
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Leave empty to disable the agreement requirement. Supports Markdown, HTML, or a full URL to redirect users.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='legal.privacy_policy'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Privacy Policy')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t(
                          'Provide Markdown, HTML, or an external URL for the privacy policy'
                        )}
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Leave empty to disable the privacy policy requirement. Supports Markdown, HTML, or a full URL to redirect users.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsFormGrid>
          </SettingsForm>
        </Form>
      </SettingsSection>
    </>
  )
}

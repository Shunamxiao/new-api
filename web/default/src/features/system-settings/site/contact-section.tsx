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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  parseHomeContactConfig,
  serializeHomeContactConfig,
  type HomeContactConfig,
} from '@/features/home/contact-config'
import { FormDirtyIndicator } from '../components/form-dirty-indicator'
import { FormNavigationGuard } from '../components/form-navigation-guard'
import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useSettingsForm } from '../hooks/use-settings-form'
import { useUpdateOption } from '../hooks/use-update-option'

type ContactSectionProps = {
  defaultValue: string
}

const contactSchema = z.object({
  apiBaseUrl: z.string().optional(),
  apiEndpoint: z.string().optional(),
  docsUrl: z.string().optional(),
  imageGenerationUrl: z.string().optional(),
  contactUrl: z.string().optional(),
  rechargeUrl: z.string().optional(),
  contactTitle: z.string().optional(),
  contactDescription: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactSchema>

function toFormValues(config: HomeContactConfig): ContactFormValues {
  return {
    apiBaseUrl: config.apiBaseUrl,
    apiEndpoint: config.apiEndpoint,
    docsUrl: config.docsUrl,
    imageGenerationUrl: config.imageGenerationUrl,
    contactUrl: config.contactUrl,
    rechargeUrl: config.rechargeUrl,
    contactTitle: config.contactTitle,
    contactDescription: config.contactDescription,
  }
}

function normalizeConfig(data: ContactFormValues): HomeContactConfig {
  return parseHomeContactConfig(
    serializeHomeContactConfig(data as HomeContactConfig)
  )
}

export function ContactSection(props: ContactSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const defaultValues = toFormValues(parseHomeContactConfig(props.defaultValue))

  const { form, handleSubmit, handleReset, isDirty, isSubmitting } =
    useSettingsForm<ContactFormValues>({
      resolver: zodResolver(contactSchema) as Resolver<
        ContactFormValues,
        unknown,
        ContactFormValues
      >,
      defaultValues,
      onSubmit: async (data) => {
        await updateOption.mutateAsync({
          key: 'HomeContactConfig',
          value: serializeHomeContactConfig(normalizeConfig(data)),
        })
      },
    })

  return (
    <>
      <FormNavigationGuard when={isDirty} />

      <SettingsSection title={t('Contact Us')}>
        <Form {...form}>
          <SettingsForm onSubmit={handleSubmit}>
            <SettingsPageFormActions
              onSave={handleSubmit}
              onReset={handleReset}
              isSaving={isSubmitting || updateOption.isPending}
              isResetDisabled={!isDirty}
            />
            <FormDirtyIndicator isDirty={isDirty} />

            <FormField
              control={form.control}
              name='apiBaseUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('API Base URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='https://example.com/v1' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Public API base URL displayed on the home page')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='apiEndpoint'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('API Endpoint')}</FormLabel>
                  <FormControl>
                    <Input placeholder='/images/generations' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Endpoint hint displayed under the API Base URL')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='docsUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Get Started URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='/docs' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Link target for the Get Started entry')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='imageGenerationUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Image Generation URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='https://image.example.com' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Link target for the Image Generation entry')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='contactUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Contact URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='https://t.me/example' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Link target for the Contact Us entry')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='rechargeUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Recharge URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='/topup' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Recharge or billing entry used as a fallback action')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='contactTitle'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Contact Title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Contact us')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Title for contact and service information')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='contactDescription'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Contact Description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={t(
                        'Configure contact methods, recharge entry, and service links for visitors.'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('Supplementary contact and service description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsForm>
        </Form>
      </SettingsSection>
    </>
  )
}

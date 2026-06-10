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
import { useEffect, useRef } from 'react'
import * as z from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Markdown } from '@/components/ui/markdown'
import { Textarea } from '@/components/ui/textarea'
import { FormDirtyIndicator } from '../components/form-dirty-indicator'
import { FormNavigationGuard } from '../components/form-navigation-guard'
import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const schema = z.object({
  keysUsageGuide: z.string(),
})

type Values = z.infer<typeof schema>

type KeysUsageGuideSectionProps = {
  defaultValue: string
}

export function KeysUsageGuideSection({
  defaultValue,
}: KeysUsageGuideSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: {
      keysUsageGuide: defaultValue.trim(),
    },
  })

  const { isDirty, isSubmitting } = form.formState
  const savedValueRef = useRef(defaultValue.trim())
  const guide = form.watch('keysUsageGuide')
  const preview = guide.trim()

  useEffect(() => {
    const normalizedDefault = defaultValue.trim()
    savedValueRef.current = normalizedDefault
    if (!isDirty) {
      form.reset({ keysUsageGuide: normalizedDefault })
    }
  }, [defaultValue, form, isDirty])

  async function onSubmit(values: Values) {
    const normalized = values.keysUsageGuide.trim()
    if (normalized === savedValueRef.current) {
      toast.info(t('No changes to save'))
      return
    }

    await updateOption.mutateAsync({
      key: 'KeysUsageGuide',
      value: normalized,
    })

    savedValueRef.current = normalized
    form.reset({ keysUsageGuide: normalized })
  }

  return (
    <>
      <FormNavigationGuard when={isDirty} />

      <SettingsSection title={t('API key usage guide')}>
        <Form {...form}>
          <SettingsForm
            onSubmit={form.handleSubmit(onSubmit)}
            autoComplete='off'
          >
            <SettingsPageFormActions
              onSave={form.handleSubmit(onSubmit)}
              isSaving={updateOption.isPending || isSubmitting}
              isSaveDisabled={!isDirty}
              saveLabel='Save API key usage guide'
            />
            <FormDirtyIndicator isDirty={isDirty} />

            <FormField
              control={form.control}
              name='keysUsageGuide'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('API key usage guide')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={12}
                      placeholder={t('Enter API key usage instructions...')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('Markdown content shown above the API keys table.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div data-settings-form-span='full' className='min-w-0 space-y-2'>
              <div className='text-sm font-medium'>{t('Markdown preview')}</div>
              <div className='bg-muted/20 min-h-24 overflow-hidden rounded-lg border p-3'>
                {preview ? (
                  <Markdown>{preview}</Markdown>
                ) : (
                  <p className='text-muted-foreground text-sm'>
                    {t('Nothing to preview.')}
                  </p>
                )}
              </div>
            </div>
          </SettingsForm>
        </Form>
      </SettingsSection>
    </>
  )
}

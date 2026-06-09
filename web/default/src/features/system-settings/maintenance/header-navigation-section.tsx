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
import { useEffect, useMemo } from 'react'
import * as z from 'zod'
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  FileText,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsForm } from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import {
  HEADER_NAV_BUILTIN_ITEMS,
  HEADER_NAV_DEFAULT,
  type HeaderNavItemConfig,
  type HeaderNavItemType,
  type HeaderNavModulesConfig,
  serializeHeaderNavModules,
} from './config'

const BUILTIN_IDS = new Set(HEADER_NAV_BUILTIN_ITEMS.map((item) => item.id))

const createHeaderNavSchema = (t: (key: string) => string) => {
  const navItemSchema = z
    .object({
      id: z.string().min(1),
      enabled: z.boolean(),
      label: z.string().trim().min(1, t('Navigation label is required')),
      type: z.enum(['builtin', 'link', 'modal']),
      href: z.string().optional(),
      external: z.boolean(),
      modalTitle: z.string().optional(),
      modalContent: z.string().optional(),
    })
    .superRefine((item, ctx) => {
      if (item.type === 'link' && !item.href?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['href'],
          message: t('Navigation URL is required'),
        })
      }
      if (item.type === 'modal' && !item.modalContent?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['modalContent'],
          message: t('Modal content is required'),
        })
      }
    })

  return z.object({
    items: z.array(navItemSchema).min(1),
    pricingRequireAuth: z.boolean(),
    rankingsRequireAuth: z.boolean(),
  })
}

type HeaderNavFormValues = z.infer<ReturnType<typeof createHeaderNavSchema>>

type HeaderNavigationSectionProps = {
  config: HeaderNavModulesConfig
  persistedValue: string
}

type NavItemEditorProps = {
  form: UseFormReturn<HeaderNavFormValues>
  index: number
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

const builtinItemById = new Map(
  HEADER_NAV_BUILTIN_ITEMS.map((item) => [item.id, item])
)

function normalizeItems(config: HeaderNavModulesConfig): HeaderNavItemConfig[] {
  const items =
    config.items.length > 0 ? config.items : HEADER_NAV_BUILTIN_ITEMS
  return items.map((item) => ({
    id: item.id,
    enabled: item.enabled,
    label: item.label,
    type: BUILTIN_IDS.has(item.id) ? 'builtin' : item.type,
    href: item.href ?? '',
    external: Boolean(item.external),
    modalTitle: item.modalTitle ?? '',
    modalContent: item.modalContent ?? '',
  }))
}

function localizeBuiltinDefaultLabel(
  item: HeaderNavItemConfig,
  t: (key: string) => string
): HeaderNavItemConfig {
  const builtin = builtinItemById.get(item.id)
  if (!builtin || item.label !== builtin.label) return item

  return {
    ...item,
    label: t(builtin.label),
  }
}

const toFormValues = (
  config: HeaderNavModulesConfig,
  t: (key: string) => string
): HeaderNavFormValues => ({
  items: normalizeItems(config).map((item) =>
    localizeBuiltinDefaultLabel(item, t)
  ),
  pricingRequireAuth:
    config.pricing?.requireAuth ?? HEADER_NAV_DEFAULT.pricing.requireAuth,
  rankingsRequireAuth:
    config.rankings?.requireAuth ?? HEADER_NAV_DEFAULT.rankings.requireAuth,
})

function createCustomItem(
  type: HeaderNavItemType,
  t: (key: string) => string
): HeaderNavItemConfig {
  const label = type === 'modal' ? t('New modal item') : t('New link item')

  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    label,
    type,
    href: type === 'link' ? 'https://example.com' : '',
    external: type === 'link',
    modalTitle: type === 'modal' ? label : '',
    modalContent: type === 'modal' ? t('Markdown content') : '',
  }
}

function buildPayload(
  values: HeaderNavFormValues,
  config: HeaderNavModulesConfig
): HeaderNavModulesConfig {
  const items = values.items.map((item) => ({
    ...item,
    label: item.label.trim(),
    href: BUILTIN_IDS.has(item.id)
      ? (builtinItemById.get(item.id)?.href ?? '')
      : (item.href?.trim() ?? ''),
    external: BUILTIN_IDS.has(item.id) ? false : item.external,
    modalTitle: item.modalTitle?.trim() ?? '',
    modalContent: item.modalContent ?? '',
  }))

  return {
    ...config,
    items,
    home: items.find((item) => item.id === 'home')?.enabled ?? false,
    console: items.find((item) => item.id === 'console')?.enabled ?? false,
    docs: items.find((item) => item.id === 'docs')?.enabled ?? false,
    about: items.find((item) => item.id === 'about')?.enabled ?? false,
    pricing: {
      ...(config.pricing ?? HEADER_NAV_DEFAULT.pricing),
      enabled: items.find((item) => item.id === 'pricing')?.enabled ?? false,
      requireAuth: values.pricingRequireAuth,
    },
    rankings: {
      ...(config.rankings ?? HEADER_NAV_DEFAULT.rankings),
      enabled: items.find((item) => item.id === 'rankings')?.enabled ?? false,
      requireAuth: values.rankingsRequireAuth,
    },
  }
}

function NavItemEditor({
  form,
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: NavItemEditorProps) {
  const { t } = useTranslation()
  const item = form.watch(`items.${index}`)
  const isBuiltin = item.type === 'builtin'
  const isLink = item.type === 'link'
  const isModal = item.type === 'modal'
  const displayLabel = item.label

  return (
    <div className='rounded-lg border'>
      <div className='border-border bg-muted/20 flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex min-w-0 items-center gap-3'>
          {isModal ? (
            <FileText className='text-muted-foreground size-4 shrink-0' />
          ) : (
            <Link2 className='text-muted-foreground size-4 shrink-0' />
          )}
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='truncate text-sm font-medium'>
                {displayLabel || t('Untitled navigation item')}
              </span>
              <Badge variant={isBuiltin ? 'secondary' : 'outline'}>
                {isBuiltin ? t('Built-in') : t('Custom')}
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1 truncate text-xs'>
              {isModal ? t('Markdown modal') : item.href || t('No URL set')}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <FormField
            control={form.control}
            name={`items.${index}.enabled`}
            render={({ field }) => (
              <FormItem className='flex items-center gap-2'>
                <FormLabel className='text-xs'>{t('Enabled')}</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            disabled={!canMoveUp}
            onClick={onMoveUp}
            aria-label={t('Move up')}
          >
            <ArrowUp className='size-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            disabled={!canMoveDown}
            onClick={onMoveDown}
            aria-label={t('Move down')}
          >
            <ArrowDown className='size-4' />
          </Button>
          {!isBuiltin && (
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              onClick={onRemove}
              aria-label={t('Delete')}
            >
              <Trash2 className='size-4' />
            </Button>
          )}
        </div>
      </div>

      <div className='grid gap-4 p-4 lg:grid-cols-2'>
        <FormField
          control={form.control}
          name={`items.${index}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Navigation label')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('Docs')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`items.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Action type')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                disabled={isBuiltin}
              >
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {isBuiltin && (
                      <SelectItem value='builtin'>
                        {t('Built-in route')}
                      </SelectItem>
                    )}
                    <SelectItem value='link'>{t('Jump link')}</SelectItem>
                    <SelectItem value='modal'>{t('Markdown modal')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormDescription>
                {isBuiltin
                  ? t('Built-in items use a fixed system route.')
                  : t('Choose whether this item opens a link or a modal.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isBuiltin && (
          <FormItem>
            <FormLabel>{t('Navigation URL')}</FormLabel>
            <FormControl>
              <Input value={item.href || ''} readOnly />
            </FormControl>
            <FormDescription>
              {t('This route is fixed by the system.')}
            </FormDescription>
          </FormItem>
        )}

        {isLink && (
          <>
            <FormField
              control={form.control}
              name={`items.${index}.href`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Navigation URL')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='/pricing' />
                  </FormControl>
                  <FormDescription>
                    {t('Use an internal path or a full external URL.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`items.${index}.external`}
              render={({ field }) => (
                <FormItem className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2'>
                  <div className='space-y-0.5'>
                    <FormLabel className='flex items-center gap-2'>
                      <ExternalLink className='size-4' />
                      {t('Open in new tab')}
                    </FormLabel>
                    <FormDescription>
                      {t('Recommended for external URLs.')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}

        {isModal && (
          <div className='space-y-4 lg:col-span-2'>
            <FormField
              control={form.control}
              name={`items.${index}.modalTitle`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Modal title')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={item.label || t('Details')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`items.${index}.modalContent`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Modal Markdown content')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={8}
                      placeholder={`## ${t('Title')}\n\n${t('Markdown content')}`}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Supports Markdown syntax and is shown in a centered modal.'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function HeaderNavigationSection({
  config,
  persistedValue,
}: HeaderNavigationSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const formDefaults = useMemo(() => toFormValues(config, t), [config, t])
  const headerNavSchema = useMemo(() => createHeaderNavSchema(t), [t])

  const form = useForm<HeaderNavFormValues>({
    resolver: zodResolver(headerNavSchema),
    defaultValues: formDefaults,
  })

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'items',
    keyName: 'fieldId',
  })

  useEffect(() => {
    form.reset(formDefaults)
  }, [formDefaults, form])

  const onSubmit = async (values: HeaderNavFormValues) => {
    const payload = buildPayload(values, config)
    const serialized = serializeHeaderNavModules(payload)
    if (serialized === persistedValue.trim()) return

    await updateOption.mutateAsync({
      key: 'HeaderNavModules',
      value: serialized,
    })
  }

  const resetToDefault = () => {
    form.reset(toFormValues(HEADER_NAV_DEFAULT, t))
  }

  return (
    <SettingsSection title={t('Header navigation')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            onReset={resetToDefault}
            isSaving={updateOption.isPending}
            resetLabel='Reset to default'
            saveLabel='Save navigation'
          />

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => append(createCustomItem('link', t))}
            >
              <Plus className='mr-2 size-4' />
              {t('Add link')}
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => append(createCustomItem('modal', t))}
            >
              <Plus className='mr-2 size-4' />
              {t('Add modal')}
            </Button>
          </div>

          <div className='space-y-4'>
            {fields.map((field, index) => (
              <NavItemEditor
                key={field.fieldId}
                form={form}
                index={index}
                canMoveUp={index > 0}
                canMoveDown={index < fields.length - 1}
                onMoveUp={() => move(index, index - 1)}
                onMoveDown={() => move(index, index + 1)}
                onRemove={() => remove(index)}
              />
            ))}
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            <FormField
              control={form.control}
              name='pricingRequireAuth'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between gap-3 rounded-lg border px-4 py-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>{t('Require login to view models')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Visitors must authenticate before accessing the pricing directory.'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='rankingsRequireAuth'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between gap-3 rounded-lg border px-4 py-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>{t('Require login to view rankings')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Visitors must authenticate before accessing the rankings page.'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}

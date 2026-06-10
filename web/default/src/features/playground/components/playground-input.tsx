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
import { useState } from 'react'
import {
  PaperclipIcon,
  FileIcon,
  ImageIcon,
  ScreenShareIcon,
  CameraIcon,
  GlobeIcon,
  SendIcon,
  SquareIcon,
  BarChartIcon,
  BoxIcon,
  NotepadTextIcon,
  CodeSquareIcon,
  GraduationCapIcon,
  KeyRoundIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import { ModelGroupSelector } from '@/components/model-group-selector'
import type {
  ModelOption,
  GroupOption,
  PlaygroundConfig,
  PlaygroundTokenOption,
} from '../types'

interface PlaygroundInputProps {
  onSubmit: (text: string) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  models: ModelOption[]
  modelValue: string
  onModelChange: (value: string) => void
  isModelLoading?: boolean
  groups: GroupOption[]
  groupValue: string
  onGroupChange: (value: string) => void
  tokens: PlaygroundTokenOption[]
  tokenValue: number
  onTokenChange: (value: number) => void
  submitDisabledReason?: string | null
  mode: PlaygroundConfig['mode']
  imageN: number
  imageSize: string
  imageQuality: string
  imageResponseFormat: PlaygroundConfig['image_response_format']
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
}

const imageSizeOptions = ['1024x1024', '1024x1536', '1536x1024', 'auto']
const imageQualityOptions = ['auto', 'low', 'medium', 'high', 'standard', 'hd']

const suggestions = [
  { icon: BarChartIcon, text: 'Analyze data', color: '#76d0eb' },
  { icon: BoxIcon, text: 'Surprise me', color: '#76d0eb' },
  { icon: NotepadTextIcon, text: 'Summarize text', color: '#ea8444' },
  { icon: CodeSquareIcon, text: 'Code', color: '#6c71ff' },
  { icon: GraduationCapIcon, text: 'Get advice', color: '#76d0eb' },
  { icon: null, text: 'More' },
]

export function PlaygroundInput({
  onSubmit,
  onStop,
  disabled,
  isGenerating,
  models,
  modelValue,
  onModelChange,
  isModelLoading = false,
  groups,
  groupValue,
  onGroupChange,
  tokens,
  tokenValue,
  onTokenChange,
  submitDisabledReason,
  mode,
  imageN,
  imageSize,
  imageQuality,
  imageResponseFormat,
  onConfigChange,
}: PlaygroundInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const isModelSelectDisabled =
    disabled || isModelLoading || models.length === 0
  const isGroupSelectDisabled = disabled || groups.length === 0
  const isTokenSelectDisabled = disabled || tokens.length === 0
  const selectedToken = tokens.find((token) => token.id === tokenValue)
  const hasUsableToken = Boolean(selectedToken)
  const canSubmit =
    !disabled && !isModelLoading && hasUsableToken && !submitDisabledReason

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return
    if (submitDisabledReason) {
      toast.error(submitDisabledReason)
      return
    }
    if (!canSubmit) return
    onSubmit(message.text)
    setText('')
  }

  const handleFileAction = (action: string) => {
    toast.info(t('Feature in development'), {
      description: action,
    })
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (submitDisabledReason) {
      toast.error(submitDisabledReason)
      return
    }
    if (!canSubmit) return
    onSubmit(suggestion)
  }

  return (
    <div className='grid shrink-0 gap-4 px-1 md:pb-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Tabs
          value={mode}
          onValueChange={(value) =>
            onConfigChange('mode', value as PlaygroundConfig['mode'])
          }
        >
          <TabsList>
            <TabsTrigger value='chat'>{t('Text')}</TabsTrigger>
            <TabsTrigger value='image'>{t('Image')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'image' && (
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              aria-label={t('Image count')}
              className='h-8 w-18'
              max={4}
              min={1}
              onChange={(event) => {
                const next = Number(event.target.value)
                onConfigChange(
                  'image_n',
                  Number.isFinite(next) ? Math.min(Math.max(next, 1), 4) : 1
                )
              }}
              type='number'
              value={imageN}
            />
            <Select
              items={imageSizeOptions.map((value) => ({ value, label: value }))}
              value={imageSize}
              onValueChange={(value) =>
                value && onConfigChange('image_size', value)
              }
            >
              <SelectTrigger className='h-8 w-32' aria-label={t('Image size')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {imageSizeOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={imageQualityOptions.map((value) => ({
                value,
                label: value,
              }))}
              value={imageQuality}
              onValueChange={(value) =>
                value && onConfigChange('image_quality', value)
              }
            >
              <SelectTrigger
                className='h-8 w-28'
                aria-label={t('Image quality')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {imageQualityOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={[
                { value: 'url', label: 'url' },
                { value: 'b64_json', label: 'b64_json' },
              ]}
              value={imageResponseFormat}
              onValueChange={(value) =>
                value &&
                onConfigChange(
                  'image_response_format',
                  value as PlaygroundConfig['image_response_format']
                )
              }
            >
              <SelectTrigger
                className='h-8 w-28'
                aria-label={t('Response format')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  <SelectItem value='url'>url</SelectItem>
                  <SelectItem value='b64_json'>b64_json</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <PromptInput groupClassName='rounded-xl' onSubmit={handleSubmit}>
        <PromptInputTextarea
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='px-5 md:text-base'
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            mode === 'image'
              ? t('Describe the image you want')
              : t('Ask anything')
          }
          value={text}
        />

        <PromptInputFooter className='p-2.5'>
          {mode === 'chat' && (
            <PromptInputTools>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <PromptInputButton
                      className='border font-medium'
                      disabled={disabled}
                      variant='outline'
                    />
                  }
                >
                  <PaperclipIcon size={16} />
                  <span className='hidden sm:inline'>{t('Attach')}</span>
                  <span className='sr-only sm:hidden'>{t('Attach')}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start'>
                  <DropdownMenuItem
                    onClick={() => handleFileAction('upload-file')}
                  >
                    <FileIcon className='mr-2' size={16} />
                    {t('Upload file')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFileAction('upload-photo')}
                  >
                    <ImageIcon className='mr-2' size={16} />
                    {t('Upload photo')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFileAction('take-screenshot')}
                  >
                    <ScreenShareIcon className='mr-2' size={16} />
                    {t('Take screenshot')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFileAction('take-photo')}
                  >
                    <CameraIcon className='mr-2' size={16} />
                    {t('Take photo')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <PromptInputButton
                className='border font-medium'
                disabled={disabled}
                onClick={() => toast.info(t('Search feature in development'))}
                variant='outline'
              >
                <GlobeIcon size={16} />
                <span className='hidden sm:inline'>{t('Search')}</span>
                <span className='sr-only sm:hidden'>{t('Search')}</span>
              </PromptInputButton>
            </PromptInputTools>
          )}

          <div className='flex items-center gap-1.5 md:gap-2'>
            <ModelGroupSelector
              selectedModel={modelValue}
              models={models}
              onModelChange={onModelChange}
              selectedGroup={groupValue}
              groups={groups}
              onGroupChange={onGroupChange}
              disabled={isModelSelectDisabled || isGroupSelectDisabled}
            />

            <Select
              items={tokens.map((token) => ({
                value: String(token.id),
                label: token.name,
              }))}
              value={tokenValue > 0 ? String(tokenValue) : ''}
              onValueChange={(value) => {
                const next = Number(value)
                if (Number.isFinite(next)) onTokenChange(next)
              }}
            >
              <SelectTrigger
                aria-label={t('API Key')}
                className='h-8 max-w-[14rem] min-w-32'
                disabled={isTokenSelectDisabled}
              >
                <KeyRoundIcon className='text-muted-foreground size-4' />
                <SelectValue>
                  {selectedToken?.name || t('API Key')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {tokens.map((token) => (
                    <SelectItem key={token.id} value={String(token.id)}>
                      <div className='flex min-w-0 flex-col'>
                        <span className='truncate'>{token.name}</span>
                        <span className='text-muted-foreground text-xs'>
                          {token.masked_key} ·{' '}
                          {token.unlimited_quota
                            ? t('Unlimited')
                            : formatQuota(token.remain_quota)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {isGenerating && onStop ? (
              <PromptInputButton
                className='text-foreground font-medium'
                onClick={onStop}
                variant='secondary'
              >
                <SquareIcon className='fill-current' size={16} />
                <span className='hidden sm:inline'>{t('Stop')}</span>
                <span className='sr-only sm:hidden'>{t('Stop')}</span>
              </PromptInputButton>
            ) : (
              <PromptInputButton
                className='text-foreground font-medium'
                disabled={!canSubmit || !text.trim()}
                type='submit'
                variant='secondary'
              >
                <SendIcon size={16} />
                <span className='hidden sm:inline'>
                  {mode === 'image' ? t('Generate') : t('Send')}
                </span>
                <span className='sr-only sm:hidden'>
                  {mode === 'image' ? t('Generate') : t('Send')}
                </span>
              </PromptInputButton>
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>

      {submitDisabledReason ? (
        <div className='text-muted-foreground px-1 text-xs'>
          {submitDisabledReason}
        </div>
      ) : !hasUsableToken ? (
        <div className='text-muted-foreground px-1 text-xs'>
          {t('Create an API key that covers the selected group and model.')}
        </div>
      ) : null}

      <Suggestions>
        {suggestions.map(({ icon: Icon, text, color }) => (
          <Suggestion
            className={`text-xs font-normal sm:text-sm ${
              text === 'More' ? 'hidden sm:flex' : ''
            }`}
            key={text}
            onClick={() => handleSuggestionClick(text)}
            suggestion={text}
            disabled={!canSubmit}
          >
            {Icon && <Icon size={16} style={{ color }} />}
            {text}
          </Suggestion>
        ))}
      </Suggestions>
    </div>
  )
}

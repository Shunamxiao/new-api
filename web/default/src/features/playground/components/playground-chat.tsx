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
import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from '@/components/ai-elements/branch'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Response } from '@/components/ai-elements/response'
import { Shimmer } from '@/components/ai-elements/shimmer'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources'
import { MESSAGE_ROLES } from '../constants'
import { getMessageContentStyles } from '../lib/message-styles'
import { parseThinkTags } from '../lib/message-utils'
import type { Message as MessageType } from '../types'
import { MessageActions } from './message-actions'
import { MessageError } from './message-error'

function getImageResultSrc(image: { url?: string; b64_json?: string }) {
  if (image.url) return image.url
  if (!image.b64_json) return ''
  if (image.b64_json.startsWith('data:')) return image.b64_json
  return `data:image/png;base64,${image.b64_json}`
}

function downloadImage(src: string, filename: string) {
  const link = document.createElement('a')
  link.href = src
  link.download = filename
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

type PreviewImage = {
  src: string
  alt: string
}

function PreviewActionButton(props: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  const { icon: Icon, label, onClick } = props

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='text-white hover:bg-white/15 hover:text-white'
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        <Icon className='size-4' aria-hidden='true' />
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function ImagePreviewDialog(props: {
  image: PreviewImage | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { image, onOpenChange } = props

  const copyImage = async () => {
    if (!image) return
    try {
      await navigator.clipboard.writeText(image.src)
      toast.success(t('Image copied to clipboard'))
    } catch {
      toast.error(t('Failed to copy to clipboard'))
    }
  }

  const downloadPreview = () => {
    if (!image) return
    downloadImage(image.src, 'playground-image.png')
  }

  const openPreview = () => {
    if (!image) return
    window.open(image.src, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={Boolean(image)} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='h-[100dvh] max-h-[100dvh] w-[100dvw] max-w-[100dvw] gap-0 overflow-hidden rounded-none border-0 bg-black/95 p-0 ring-0 sm:max-w-[100dvw]'
      >
        <DialogTitle className='sr-only'>{t('Image preview')}</DialogTitle>
        <TooltipProvider delay={300}>
          <div className='absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-black/60 p-1 backdrop-blur'>
            <PreviewActionButton
              icon={Copy}
              label={t('Copy image')}
              onClick={copyImage}
            />
            <PreviewActionButton
              icon={Download}
              label={t('Download image')}
              onClick={downloadPreview}
            />
            <PreviewActionButton
              icon={ExternalLink}
              label={t('Open in new tab')}
              onClick={openPreview}
            />
            <PreviewActionButton
              icon={X}
              label={t('Close')}
              onClick={() => onOpenChange(false)}
            />
          </div>
        </TooltipProvider>

        <div className='flex h-full w-full items-center justify-center p-3 pt-16 sm:p-6 sm:pt-16'>
          {image && (
            <img
              src={image.src}
              alt={image.alt}
              className='max-h-full max-w-full object-contain'
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PlaygroundChatProps {
  messages: MessageType[]
  onCopyMessage?: (message: MessageType) => void
  onRegenerateMessage?: (message: MessageType) => void
  onEditMessage?: (message: MessageType) => void
  onDeleteMessage?: (message: MessageType) => void
  isGenerating?: boolean
  editingKey?: string | null
  onSaveEdit?: (newContent: string) => void
  onCancelEdit?: (open: boolean) => void
  onSaveEditAndSubmit?: (newContent: string) => void
}

export function PlaygroundChat({
  messages,
  onCopyMessage,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  isGenerating = false,
  editingKey,
  onSaveEdit,
  onCancelEdit,
  onSaveEditAndSubmit,
}: PlaygroundChatProps) {
  const { t } = useTranslation()
  const [editText, setEditText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null)

  useEffect(() => {
    if (!editingKey) return
    const message = messages.find((m) => m.key === editingKey)
    const content = message?.versions?.[0]?.content || ''
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditText(content)

    setOriginalText(content)
  }, [editingKey, messages])

  const isEditing = (key: string) => editingKey === key
  const isEmpty = useMemo(() => !editText.trim(), [editText])
  const isChanged = useMemo(
    () => editText !== originalText,
    [editText, originalText]
  )
  return (
    <Conversation>
      {/* Remove outer padding; apply padding to inner centered container to align with input */}
      <ConversationContent className='p-0'>
        <div className='mx-auto w-full max-w-4xl px-4 py-4'>
          {messages.map((message, messageIndex) => {
            const { versions = [] } = message
            const isLastAssistantMessage =
              messageIndex === messages.length - 1 &&
              message.from === MESSAGE_ROLES.ASSISTANT
            return (
              <Branch defaultBranch={0} key={message.key}>
                <BranchMessages>
                  {versions.map((version, versionIndex) => (
                    <Message
                      className='group flex-row-reverse'
                      from={message.from}
                      key={`${message.key}-${version.id}-${versionIndex}`}
                    >
                      <div className='w-full min-w-0 flex-1 basis-full py-1'>
                        {isEditing(message.key) ? (
                          <div className='space-y-2'>
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className='font-mono text-sm'
                              rows={8}
                            />
                            <div className='flex gap-2'>
                              {/* Save & Submit only makes sense for user messages */}
                              {message.from === MESSAGE_ROLES.USER && (
                                <Button
                                  size='sm'
                                  onClick={() =>
                                    onSaveEditAndSubmit?.(editText)
                                  }
                                  disabled={isEmpty || !isChanged}
                                >
                                  {t('Save & Submit')}
                                </Button>
                              )}
                              <Button
                                size='sm'
                                onClick={() => onSaveEdit?.(editText)}
                                disabled={isEmpty || !isChanged}
                              >
                                {t('Save')}
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => onCancelEdit?.(false)}
                              >
                                {t('Cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const isAssistant =
                                message.from === MESSAGE_ROLES.ASSISTANT
                              const hasSources = !!message.sources?.length
                              const showReasoning =
                                isAssistant && !!message.reasoning?.content
                              const showLoader =
                                isAssistant &&
                                !message.isReasoningStreaming &&
                                (message.status === 'loading' ||
                                  (message.status === 'streaming' &&
                                    !version.content))
                              const showMessageContent =
                                (message.from === MESSAGE_ROLES.USER ||
                                  !message.isReasoningStreaming) &&
                                !!version.content
                              const hasImageData =
                                isAssistant && !!message.imageData?.length

                              // Extract visible content (remove <think> tags for assistant messages)
                              const displayContent = isAssistant
                                ? parseThinkTags(version.content).visibleContent
                                : version.content

                              const actions = (
                                <MessageActions
                                  message={message}
                                  onCopy={onCopyMessage}
                                  onRegenerate={onRegenerateMessage}
                                  onEdit={onEditMessage}
                                  onDelete={onDeleteMessage}
                                  isGenerating={isGenerating}
                                  alwaysVisible={isLastAssistantMessage}
                                  className='mt-1'
                                />
                              )

                              return (
                                <>
                                  {/* Sources */}
                                  {hasSources && (
                                    <Sources>
                                      <SourcesTrigger
                                        count={message.sources!.length}
                                      />
                                      <SourcesContent>
                                        {message.sources!.map(
                                          (source, sourceIndex) => (
                                            <Source
                                              href={source.href}
                                              key={`${message.key}-source-${sourceIndex}`}
                                              title={source.title}
                                            />
                                          )
                                        )}
                                      </SourcesContent>
                                    </Sources>
                                  )}

                                  {/* Reasoning */}
                                  {showReasoning && (
                                    <Reasoning
                                      defaultOpen={true}
                                      isStreaming={message.isReasoningStreaming}
                                    >
                                      <ReasoningTrigger />
                                      <ReasoningContent>
                                        {message.reasoning!.content}
                                      </ReasoningContent>
                                    </Reasoning>
                                  )}

                                  {/* Loader */}
                                  {showLoader && (
                                    <div className='flex items-center gap-2 py-2'>
                                      <Loader />
                                      <Shimmer className='text-sm' duration={1}>
                                        {t('Responding...')}
                                      </Shimmer>
                                    </div>
                                  )}

                                  {/* Error or Content */}
                                  {message.status === 'error' ? (
                                    <>
                                      <MessageError
                                        message={message}
                                        className='mb-2'
                                      />
                                      {actions}
                                    </>
                                  ) : (
                                    (showMessageContent || hasImageData) && (
                                      <>
                                        <MessageContent
                                          variant='flat'
                                          className={cn(
                                            getMessageContentStyles()
                                          )}
                                        >
                                          {showMessageContent && (
                                            <Response>{displayContent}</Response>
                                          )}
                                          {hasImageData && (
                                            <div className='grid gap-3 sm:grid-cols-2'>
                                              {message.imageData!.map(
                                                (image, imageIndex) => {
                                                  const src =
                                                    getImageResultSrc(image)
                                                  if (!src) return null
                                                  const alt = t(
                                                    'Generated image {{index}}',
                                                    { index: imageIndex + 1 }
                                                  )
                                                  return (
                                                    <button
                                                      type='button'
                                                      key={`${message.key}-image-${imageIndex}`}
                                                      className='bg-muted group/image relative block overflow-hidden rounded-lg border text-left'
                                                      aria-label={t(
                                                        'Preview image'
                                                      )}
                                                      onClick={() =>
                                                        setPreviewImage({
                                                          src,
                                                          alt,
                                                        })
                                                      }
                                                    >
                                                      <img
                                                        src={src}
                                                        alt={alt}
                                                        className='aspect-square h-auto w-full object-cover'
                                                        loading='lazy'
                                                      />
                                                      <span className='absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/image:bg-black/35 group-hover/image:opacity-100'>
                                                        <span className='inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white'>
                                                          <Maximize2
                                                            className='size-3.5'
                                                            aria-hidden='true'
                                                          />
                                                          {t('Preview')}
                                                        </span>
                                                      </span>
                                                    </button>
                                                  )
                                                }
                                              )}
                                            </div>
                                          )}
                                        </MessageContent>
                                        {actions}
                                      </>
                                    )
                                  )}
                                </>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    </Message>
                  ))}
                </BranchMessages>

                {/* Branch selector for multiple versions */}
                {versions.length > 1 && (
                  <BranchSelector className='px-0' from={message.from}>
                    <BranchPrevious />
                    <BranchPage />
                    <BranchNext />
                  </BranchSelector>
                )}
              </Branch>
            )
          })}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
      <ImagePreviewDialog
        image={previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      />
    </Conversation>
  )
}

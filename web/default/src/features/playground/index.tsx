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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getPlaygroundOptions } from './api'
import { PlaygroundChat } from './components/playground-chat'
import { PlaygroundInput } from './components/playground-input'
import { usePlaygroundState, useChatHandler } from './hooks'
import { createUserMessage, createLoadingAssistantMessage } from './lib'
import type { Message as MessageType } from './types'

function isImageGenerationModel(modelName: string) {
  const model = modelName.toLowerCase()
  return (
    model.includes('dall-e-3') ||
    model.includes('dall-e-2') ||
    model.includes('gpt-image-') ||
    model.startsWith('imagen-') ||
    model.includes('flux-') ||
    model.includes('flux.1-')
  )
}

function filterModelsForMode(modelNames: string[], mode: 'chat' | 'image') {
  if (mode === 'image') {
    const imageModels = modelNames.filter(isImageGenerationModel)
    return imageModels.length > 0 ? imageModels : modelNames
  }
  return modelNames.filter((model) => !isImageGenerationModel(model))
}

function getOptionsLoadErrorMessage(error: unknown, t: (key: string) => string) {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
    if (status === 401) {
      return t('Session expired!')
    }
    if (status === 404) {
      return t('Playground options endpoint is unavailable')
    }
  }

  return error instanceof Error
    ? error.message
    : t('Failed to load playground options')
}

export function Playground() {
  const { t } = useTranslation()
  const {
    config,
    parameterEnabled,
    messages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  // Edit dialog state
  const [editingMessageKey, setEditingMessageKey] = useState<string | null>(
    null
  )

  const { data: optionsData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ['playground-options'],
    queryFn: async () => {
      try {
        return await getPlaygroundOptions()
      } catch (error) {
        toast.error(getOptionsLoadErrorMessage(error, t))
        return {
          groups: [],
          group_models: {},
          tokens: [],
        }
      }
    },
  })

  const currentGroupModels = useMemo(() => {
    const names = optionsData?.group_models?.[config.group] ?? []
    return filterModelsForMode(names, config.mode).map((model) => ({
      label: model,
      value: model,
    }))
  }, [optionsData?.group_models, config.group, config.mode])

  const availableTokens = useMemo(() => {
    const allTokens = optionsData?.tokens ?? []
    return allTokens.filter(
      (token) =>
        token.group === config.group &&
        token.allowed_models.includes(config.model)
    )
  }, [optionsData?.tokens, config.group, config.model])

  useEffect(() => {
    if (!optionsData) return

    setGroups(optionsData.groups)

    const hasCurrentGroup = optionsData.groups.some(
      (g) => g.value === config.group
    )
    if (!hasCurrentGroup && optionsData.groups.length > 0) {
      const fallback =
        optionsData.groups.find((g) => g.value === 'default')?.value ??
        optionsData.groups[0].value
      updateConfig('group', fallback)
    }
  }, [optionsData, setGroups, config.group, updateConfig])

  useEffect(() => {
    setModels(currentGroupModels)
    const isCurrentModelValid = currentGroupModels.some(
      (m) => m.value === config.model
    )
    if (currentGroupModels.length > 0 && !isCurrentModelValid) {
      updateConfig('model', currentGroupModels[0].value)
    }
  }, [currentGroupModels, config.model, setModels, updateConfig])

  useEffect(() => {
    const isCurrentTokenValid = availableTokens.some(
      (token) => token.id === config.token_id
    )
    if (availableTokens.length > 0 && !isCurrentTokenValid) {
      updateConfig('token_id', availableTokens[0].id)
    }
    if (availableTokens.length === 0 && config.token_id !== 0) {
      updateConfig('token_id', 0)
    }
  }, [availableTokens, config.token_id, updateConfig])

  const handleSendMessage = (text: string) => {
    const userMessage = createUserMessage(text)
    const assistantMessage = createLoadingAssistantMessage()

    const newMessages = [...messages, userMessage, assistantMessage]
    updateMessages(newMessages)

    // Send chat request
    sendChat(newMessages)
  }

  const handleCopyMessage = (message: MessageType) => {
    // Copy is handled in MessageActions component
    // eslint-disable-next-line no-console
    console.log('Message copied:', message.key)
  }

  const handleRegenerateMessage = (message: MessageType) => {
    // Find the message index and regenerate from there
    const messageIndex = messages.findIndex((m) => m.key === message.key)
    if (messageIndex === -1) return

    // Remove messages after this one and regenerate
    const messagesUpToHere = messages.slice(0, messageIndex)
    const loadingMessage = createLoadingAssistantMessage()
    const newMessages = [...messagesUpToHere, loadingMessage]

    updateMessages(newMessages)
    sendChat(newMessages)
  }

  const handleEditMessage = useCallback((message: MessageType) => {
    setEditingMessageKey(message.key)
  }, [])

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditingMessageKey(null)
  }, [])

  // Apply edit and optionally re-submit from the edited user message
  const applyEdit = useCallback(
    (newContent: string, submit: boolean) => {
      if (!editingMessageKey) return
      const index = messages.findIndex((m) => m.key === editingMessageKey)
      if (index === -1) return

      const updated = messages.map((m) =>
        m.key === editingMessageKey
          ? { ...m, versions: [{ ...m.versions[0], content: newContent }] }
          : m
      )

      setEditingMessageKey(null)

      if (!submit || updated[index].from !== 'user') {
        updateMessages(updated)
        return
      }

      const toSubmit = [
        ...updated.slice(0, index + 1),
        createLoadingAssistantMessage(),
      ]
      updateMessages(toSubmit)
      sendChat(toSubmit)
    },
    [editingMessageKey, messages, updateMessages, sendChat]
  )

  const handleDeleteMessage = (message: MessageType) => {
    const newMessages = messages.filter((m) => m.key !== message.key)
    updateMessages(newMessages)
  }

  return (
    <div className='relative flex size-full flex-col overflow-hidden'>
      <div className='pointer-events-none absolute top-3 right-4 z-10 hidden max-w-xs items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur md:flex'>
        <ShieldCheck className='size-4 shrink-0 text-emerald-600' />
        <span>
          {t(
            'The server does not store chat messages. Save important content yourself.'
          )}
        </span>
      </div>

      {/* Full-width scroll container: scrolling works even over side whitespace */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='mx-auto flex w-full max-w-4xl items-center gap-2 px-4 pt-3 text-xs text-muted-foreground md:hidden'>
          <ShieldCheck className='size-4 shrink-0 text-emerald-600' />
          <span>
            {t(
              'The server does not store chat messages. Save important content yourself.'
            )}
          </span>
        </div>
        <PlaygroundChat
          messages={messages}
          onCopyMessage={handleCopyMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          isGenerating={isGenerating}
          editingKey={editingMessageKey}
          onCancelEdit={handleEditOpenChange}
          onSaveEdit={(newContent) => applyEdit(newContent, false)}
          onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
        />
      </div>

      {/* Input area: center content and constrain to the same container width */}
      <div className='mx-auto w-full max-w-4xl'>
        <PlaygroundInput
          disabled={isGenerating}
          groups={groups}
          groupValue={config.group}
          imageN={config.image_n}
          imageQuality={config.image_quality}
          imageResponseFormat={config.image_response_format}
          imageSize={config.image_size}
          isGenerating={isGenerating}
          isModelLoading={isLoadingOptions}
          mode={config.mode}
          modelValue={config.model}
          models={models}
          onConfigChange={updateConfig}
          onGroupChange={(value) => updateConfig('group', value)}
          onModelChange={(value) => updateConfig('model', value)}
          onStop={stopGeneration}
          onSubmit={handleSendMessage}
          onTokenChange={(value) => updateConfig('token_id', value)}
          tokenValue={config.token_id}
          tokens={availableTokens}
        />
      </div>
    </div>
  )
}

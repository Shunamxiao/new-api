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
import {
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  Check,
  Copy,
  Download,
  Eye,
  ImageIcon,
  KeyRound,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api, getCommonHeaders } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { getPlaygroundOptions } from '@/features/playground/api'
import type {
  PlaygroundOptions,
  PlaygroundTokenOption,
} from '@/features/playground/types'

type ImageTaskStatus = 'running' | 'done' | 'error'
type TaskFilterStatus = ImageTaskStatus | 'all'

type GeneratedImage = {
  id: string
  src: string
  revisedPrompt?: string
}

type ReferenceImage = {
  id: string
  name: string
  src: string
  file?: File
}

type ImageTask = {
  id: string
  prompt: string
  model: string
  apiKeyName: string
  apiKeyGroup: string
  size: string
  quality: string
  n: number
  status: ImageTaskStatus
  createdAt: number
  elapsed?: number
  images: GeneratedImage[]
  mode?: 'generate' | 'edit'
  referenceCount?: number
  error?: string
}

type PreviewState = {
  image: GeneratedImage
  task?: ImageTask
}

type ImageInput = {
  group: string
  prompt: string
  model: string
  size: string
  quality: string
  n: number
  tokenId: number
}

type ImageGenerationPayload = {
  group: string
  model: string
  token_id: number
  prompt: string
  n: number
  size: string
  quality: string
  response_format: 'url' | 'b64_json'
}

type ImageGenerationResponse = {
  created?: number
  data?: Array<{
    url?: string
    b64_json?: string
    revised_prompt?: string
  }>
  error?: {
    message?: string
    type?: string
    code?: string
  }
  message?: string
}

const TASK_STORAGE_KEY = 'image_generation_tasks'
const MAX_STORED_TASKS = 20
const MAX_REFERENCE_IMAGES = 4
const IMAGE_ENDPOINT = '/pg/images/generations'
const IMAGE_EDIT_ENDPOINT = '/pg/images/edits'

const FALLBACK_MODEL_OPTIONS = ['gpt-image-2', 'gpt-image-1', 'dall-e-3']
const AUTO_SIZE_VALUE = 'auto'
const CUSTOM_SIZE_VALUE = 'custom'
const SIZE_OPTIONS = [AUTO_SIZE_VALUE, '1024x1024', '1024x1536', '1536x1024']
const QUALITY_OPTIONS = ['auto', 'low', 'medium', 'high']

function isPresetSize(value: string) {
  return SIZE_OPTIONS.includes(value)
}

function isImageGenerationModel(modelName: string) {
  const normalized = modelName.toLowerCase()
  return (
    normalized.includes('dall-e-3') ||
    normalized.includes('dall-e-2') ||
    normalized.includes('gpt-image-') ||
    normalized.startsWith('imagen-') ||
    normalized.includes('flux-') ||
    normalized.includes('flux.1-')
  )
}

function getImageModels(options: PlaygroundOptions | undefined) {
  const models = new Set<string>()
  for (const groupModels of Object.values(options?.group_models ?? {})) {
    for (const modelName of groupModels) {
      if (isImageGenerationModel(modelName)) {
        models.add(modelName)
      }
    }
  }
  return Array.from(models).sort()
}

function getTokensForModel(
  options: PlaygroundOptions | undefined,
  modelName: string
) {
  return (options?.tokens ?? []).filter(
    (token) =>
      token.status === 1 &&
      token.allowed_models.includes(modelName) &&
      Boolean(token.group)
  )
}

function getTokenLabel(token: PlaygroundTokenOption) {
  return token.name || token.masked_key || `#${token.id}`
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getStoredTasks(): ImageTask[] {
  try {
    const raw = window.localStorage.getItem(TASK_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ImageTask[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function storeTasks(tasks: ImageTask[], translate: (key: string) => string) {
  try {
    window.localStorage.setItem(
      TASK_STORAGE_KEY,
      JSON.stringify(tasks.slice(0, MAX_STORED_TASKS))
    )
  } catch {
    toast.warning(translate('Image history storage is full'))
  }
}

function normalizeGeneratedImages(
  response: ImageGenerationResponse
): GeneratedImage[] {
  if (!Array.isArray(response.data)) return []

  const images: GeneratedImage[] = []
  response.data.forEach((item) => {
    const src = item.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item.url
    if (!src) return

    const image: GeneratedImage = {
      id: createId(),
      src,
    }
    if (item.revised_prompt) {
      image.revisedPrompt = item.revised_prompt
    }
    images.push(image)
  })

  return images
}

async function parseImageResponse(
  res: Response,
  translate: (key: string) => string
): Promise<ImageGenerationResponse> {
  const data = (await res.json().catch(() => null)) as
    | ImageGenerationResponse
    | null

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `${res.status} ${res.statusText}`.trim()
    throw new Error(message)
  }

  if (!data) {
    throw new Error(translate('Empty image generation response'))
  }

  return data
}

function getErrorMessage(error: unknown, translate: (key: string) => string) {
  const rawMessage = isAxiosError(error)
    ? error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message
    : error instanceof Error
      ? error.message
      : translate('Image generation failed')
  const message = String(rawMessage || translate('Image generation failed'))
  const normalized = message.toLowerCase()
  if (
    normalized.includes('524') ||
    normalized.includes('timeout') ||
    normalized.includes('cloudflare') ||
    normalized.includes('bad response status code')
  ) {
    return translate(
      'Upstream channel timed out. Please try again later or contact the administrator to check the image channel.'
    )
  }
  return message
}

function getOptionsLoadErrorMessage(error: unknown, translate: (key: string) => string) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
    if (error.response?.status === 401) return translate('Session expired!')
  }
  return error instanceof Error
    ? error.message
    : translate('Failed to load image generation options')
}

async function generateImageWithToken(
  payload: ImageGenerationPayload,
): Promise<ImageGenerationResponse> {
  const res = await api.post(IMAGE_ENDPOINT, payload, {
    skipErrorHandler: true,
  })
  return res.data
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png'
  const binary = window.atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new File([bytes], filename, { type: mime })
}

async function referenceToFile(
  reference: ReferenceImage,
  index: number
): Promise<File> {
  if (reference.file) return reference.file
  if (reference.src.startsWith('data:')) {
    return dataUrlToFile(reference.src, reference.name || `reference-${index}.png`)
  }

  const res = await fetch(reference.src)
  const blob = await res.blob()
  return new File([blob], reference.name || `reference-${index}.png`, {
    type: blob.type || 'image/png',
  })
}

async function editImageWithToken(
  input: ImageInput,
  references: ReferenceImage[],
  translate: (key: string) => string
): Promise<ImageGenerationResponse> {
  const formData = new FormData()
  formData.append('group', input.group)
  formData.append('model', input.model)
  formData.append('token_id', String(input.tokenId))
  formData.append('prompt', input.prompt)
  formData.append('n', String(input.n))
  formData.append('size', input.size)
  formData.append('quality', input.quality)
  formData.append('response_format', 'url')

  const files = await Promise.all(
    references.map((reference, index) => referenceToFile(reference, index + 1))
  )
  files.forEach((file) => formData.append('image', file, file.name))

  const headers = getCommonHeaders()
  delete headers['Content-Type']

  const res = await fetch(IMAGE_EDIT_ENDPOINT, {
    method: 'POST',
    headers,
    body: formData,
  })

  return parseImageResponse(res, translate)
}

function readImageFile(file: File): Promise<ReferenceImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        id: createId(),
        name: file.name,
        src: String(reader.result),
        file,
      })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function downloadImage(src: string, filename: string) {
  const a = document.createElement('a')
  a.href = src
  a.download = filename
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function formatElapsed(elapsed?: number) {
  if (!elapsed) return '00:00'
  const seconds = Math.max(0, Math.floor(elapsed / 1000))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function getEndpointLabel(serverAddress: unknown) {
  const base =
    typeof serverAddress === 'string' && serverAddress.trim()
      ? serverAddress.trim().replace(/\/$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : ''
  return `${base}${IMAGE_ENDPOINT}`
}

function getPromptLower(task: ImageTask) {
  return `${task.prompt} ${task.model} ${task.size} ${task.quality} ${task.apiKeyName}`.toLowerCase()
}

export function ImageGeneration() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status } = useStatus()
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('gpt-image-2')
  const [size, setSize] = useState(AUTO_SIZE_VALUE)
  const [customSize, setCustomSize] = useState('')
  const [quality, setQuality] = useState('auto')
  const [count, setCount] = useState(1)
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [tasks, setTasks] = useState<ImageTask[]>(() =>
    typeof window === 'undefined' ? [] : getStoredTasks()
  )
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskFilterStatus>('all')
  const [previewImage, setPreviewImage] = useState<PreviewState | null>(null)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [keyGuideOpen, setKeyGuideOpen] = useState(false)
  const [keyGuideAutoOpened, setKeyGuideAutoOpened] = useState(false)
  const [mobileParamsOpen, setMobileParamsOpen] = useState(false)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])

  const optionsQuery = useQuery({
    queryKey: ['image-generation-options'],
    queryFn: getPlaygroundOptions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const modelOptions = useMemo(() => {
    const models = getImageModels(optionsQuery.data)
    return models.length > 0 ? models : FALLBACK_MODEL_OPTIONS
  }, [optionsQuery.data])

  const availableKeys = useMemo(
    () => getTokensForModel(optionsQuery.data, model),
    [model, optionsQuery.data]
  )

  const selectedKey = useMemo(
    () => availableKeys.find((item) => item.id === selectedKeyId) ?? null,
    [availableKeys, selectedKeyId]
  )

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return tasks.filter((task) => {
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      if (!normalizedQuery) return true
      return getPromptLower(task).includes(normalizedQuery)
    })
  }, [filterStatus, query, tasks])

  const endpointLabel = getEndpointLabel(status?.server_address)
  const runningTaskCount = tasks.filter((task) => task.status === 'running').length
  const hasRunningTask = runningTaskCount > 0
  const canSubmit = Boolean(prompt.trim())

  useEffect(() => {
    if (modelOptions.includes(model)) return
    setModel(modelOptions[0] ?? FALLBACK_MODEL_OPTIONS[0])
  }, [model, modelOptions])

  useEffect(() => {
    const currentTokenValid =
      selectedKeyId !== null &&
      availableKeys.some((item) => item.id === selectedKeyId)
    if (currentTokenValid) return
    if (availableKeys.length > 0) {
      setSelectedKeyId(availableKeys[0].id)
      return
    }
    if (selectedKeyId !== null) {
      setSelectedKeyId(null)
    }
  }, [availableKeys, selectedKeyId])

  useEffect(() => {
    if (keyGuideAutoOpened || optionsQuery.isLoading || optionsQuery.isFetching) {
      return
    }
    if (optionsQuery.isError || availableKeys.length === 0) {
      setKeyGuideOpen(true)
      setKeyGuideAutoOpened(true)
    }
  }, [
    availableKeys.length,
    keyGuideAutoOpened,
    optionsQuery.isError,
    optionsQuery.isFetching,
    optionsQuery.isLoading,
  ])

  useEffect(() => {
    storeTasks(tasks, t)
  }, [tasks, t])

  const updateTask = (taskId: string, patch: Partial<ImageTask>) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task
      )
    )
  }

  const runGeneration = async (
    input: ImageInput,
    apiKey: PlaygroundTokenOption | null,
    references: ReferenceImage[] = referenceImages
  ) => {
    const normalizedPrompt = input.prompt.trim()
    if (!normalizedPrompt) {
      toast.error(t('Please enter a prompt'))
      promptRef.current?.focus()
      return
    }
    if (!apiKey) {
      toast.error(t('Please select an API key'))
      return
    }

    const taskId = createId()
    const startedAt = Date.now()
    const mode = references.length > 0 ? 'edit' : 'generate'
    const task: ImageTask = {
      id: taskId,
      prompt: normalizedPrompt,
      model: input.model,
      apiKeyName: getTokenLabel(apiKey),
      apiKeyGroup: apiKey.group,
      size: input.size,
      quality: input.quality,
      n: input.n,
      status: 'running',
      createdAt: startedAt,
      images: [],
      mode,
      referenceCount: references.length,
    }

    setTasks((current) => [task, ...current].slice(0, MAX_STORED_TASKS))

    try {
      const response =
        mode === 'edit'
          ? await editImageWithToken(
              { ...input, prompt: normalizedPrompt },
              references,
              t
            )
          : await generateImageWithToken({
              group: input.group,
              model: input.model,
              token_id: input.tokenId,
              prompt: normalizedPrompt,
              n: input.n,
              size: input.size,
              quality: input.quality,
              response_format: 'url',
            })
      const images = normalizeGeneratedImages(response)

      if (images.length === 0) {
        throw new Error(t('No generated images returned'))
      }

      updateTask(taskId, {
        status: 'done',
        images,
        elapsed: Date.now() - startedAt,
      })
      toast.success(
        mode === 'edit' ? t('Edited successfully') : t('Generated successfully')
      )
    } catch (error) {
      const message = getErrorMessage(error, t)
      updateTask(taskId, {
        status: 'error',
        error: message,
        elapsed: Date.now() - startedAt,
      })
      toast.error(message)
    }
  }

  const openKeyCreation = () => {
    navigate({
      to: '/keys',
      search: { open: 'create', models: model },
    })
  }

  const submitCurrent = () => {
    if (!selectedKey) {
      setKeyGuideOpen(true)
      return
    }

    const resolvedSize =
      size === CUSTOM_SIZE_VALUE ? customSize.trim() : size
    if (size === CUSTOM_SIZE_VALUE && !resolvedSize) {
      toast.error(t('Please enter a custom size'))
      return
    }

    runGeneration(
      {
        group: selectedKey.group,
        prompt,
        model,
        size: resolvedSize,
        quality,
        n: Math.min(4, Math.max(1, count)),
        tokenId: selectedKey?.id ?? 0,
      },
      selectedKey,
      referenceImages
    )
  }

  const retryTask = (task: ImageTask) => {
    const retryKey =
      getTokensForModel(optionsQuery.data, task.model).find(
        (item) => item.id === selectedKeyId
      ) ?? getTokensForModel(optionsQuery.data, task.model)[0] ?? null

    if (!retryKey) {
      setModel(task.model)
      setKeyGuideOpen(true)
      return
    }

    if (task.mode === 'edit' && referenceImages.length === 0) {
      toast.error(t('Add reference images before retrying this edit.'))
      fileInputRef.current?.click()
      return
    }

    runGeneration(
      {
        group: retryKey.group,
        prompt: task.prompt,
        model: task.model,
        size: task.size,
        quality: task.quality,
        n: task.n,
        tokenId: retryKey.id,
      },
      retryKey,
      task.mode === 'edit' ? referenceImages : []
    )
  }

  const reusePrompt = (task: ImageTask) => {
    setPrompt(task.prompt)
    setModel(task.model)
    if (isPresetSize(task.size)) {
      setSize(task.size)
      setCustomSize('')
    } else {
      setSize(CUSTOM_SIZE_VALUE)
      setCustomSize(task.size)
    }
    setQuality(task.quality)
    setCount(task.n)
    promptRef.current?.focus()
    toast.success(t('Prompt reused'))
  }

  const copyPrompt = async (taskPrompt: string) => {
    await navigator.clipboard.writeText(taskPrompt)
    toast.success(t('Copied to clipboard'))
  }

  const deleteTask = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId))
  }

  const addReferenceImages = (items: ReferenceImage[]) => {
    if (items.length === 0) return

    setReferenceImages((current) => {
      const available = MAX_REFERENCE_IMAGES - current.length
      if (available <= 0) {
        toast.warning(t('Reference image limit reached'))
        return current
      }

      const nextItems = items.slice(0, available)
      if (nextItems.length < items.length) {
        toast.warning(t('Reference image limit reached'))
      }

      toast.success(
        nextItems.length === 1
          ? t('Reference image added')
          : t('Reference images added')
      )
      return [...current, ...nextItems]
    })
  }

  const handleReferenceUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length !== files.length) {
      toast.warning(t('Only image files are supported'))
    }
    if (imageFiles.length === 0) return

    try {
      const items = await Promise.all(imageFiles.map(readImageFile))
      addReferenceImages(items)
    } catch {
      toast.error(t('Failed to load reference image'))
    }
  }

  const useGeneratedAsReference = (image: GeneratedImage, task: ImageTask) => {
    addReferenceImages([
      {
        id: createId(),
        name: `generated-${task.id}.png`,
        src: image.src,
      },
    ])
    setPrompt(task.prompt)
    setModel(task.model)
    if (isPresetSize(task.size)) {
      setSize(task.size)
      setCustomSize('')
    } else {
      setSize(CUSTOM_SIZE_VALUE)
      setCustomSize(task.size)
    }
    setQuality(task.quality)
    setCount(task.n)
    promptRef.current?.focus()
    toast.success(t('Generated image selected as reference'))
  }

  const removeReference = (id: string) => {
    setReferenceImages((current) => current.filter((item) => item.id !== id))
  }

  const clearReferences = () => {
    setReferenceImages([])
  }

  const clearTasks = () => {
    setTasks([])
    setClearDialogOpen(false)
    toast.success(t('Image tasks cleared'))
  }

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0,_transparent_28rem)]'>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-4 pb-56 sm:px-6 sm:pt-6 sm:pb-52'>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <div className='bg-background/80 ring-foreground/10 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1'>
                <ImageIcon className='size-4' aria-hidden='true' />
              </div>
              <div className='min-w-0'>
                <h1 className='truncate text-xl font-semibold tracking-tight'>
                  {t('Image Generation')}
                </h1>
                <p className='text-muted-foreground truncate text-sm'>
                  {endpointLabel}
                </p>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <div className='relative'>
              <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2' />
              <Input
                className='h-9 w-full pl-8 sm:w-64'
                value={query}
                placeholder={t('Search image tasks')}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <NativeSelect
              className='w-full sm:w-36'
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value as TaskFilterStatus)
              }
            >
              <NativeSelectOption value='all'>{t('All tasks')}</NativeSelectOption>
              <NativeSelectOption value='running'>
                {t('Generating...')}
              </NativeSelectOption>
              <NativeSelectOption value='done'>{t('Done')}</NativeSelectOption>
              <NativeSelectOption value='error'>{t('Error')}</NativeSelectOption>
            </NativeSelect>
            <Button
              variant='outline'
              size='sm'
              disabled={tasks.length === 0 || hasRunningTask}
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 data-icon='inline-start' aria-hidden='true' />
              {t('Clear tasks')}
            </Button>
          </div>
        </div>

        {optionsQuery.isError && (
          <Alert variant='destructive' className='mb-4'>
            <AlertTitle>{t('Failed to load image generation options')}</AlertTitle>
            <AlertDescription>
              {getOptionsLoadErrorMessage(optionsQuery.error, t)}
            </AlertDescription>
          </Alert>
        )}

        {availableKeys.length === 0 && !optionsQuery.isLoading && (
          <Alert className='mb-4'>
            <KeyRound className='size-4' aria-hidden='true' />
            <AlertTitle>{t('No compatible image API keys available')}</AlertTitle>
            <AlertDescription className='flex flex-col gap-2'>
              <span>
                {t(
                  'Use the API Key page to create a key in a group that includes {{model}}.',
                  { model }
                )}
              </span>
              <Button
                variant='outline'
                size='sm'
                className='w-fit'
                onClick={openKeyCreation}
              >
                {t('Create image API key')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <TaskGrid
          tasks={filteredTasks}
          hasFilters={Boolean(query.trim()) || filterStatus !== 'all'}
          onCopyPrompt={copyPrompt}
          onDelete={deleteTask}
          onDownload={downloadImage}
          onPreview={(image, task) => setPreviewImage({ image, task })}
          onRetry={retryTask}
          onReusePrompt={reusePrompt}
          onUseAsReference={useGeneratedAsReference}
        />
      </div>

      <FloatingInputBar
        canSubmit={canSubmit}
        count={count}
        customSize={customSize}
        availableKeys={availableKeys}
        isLoadingKeys={optionsQuery.isLoading}
        mobileParamsOpen={mobileParamsOpen}
        model={model}
        modelOptions={modelOptions}
        prompt={prompt}
        promptRef={promptRef}
        quality={quality}
        referenceImages={referenceImages}
        fileInputRef={fileInputRef}
        runningTaskCount={runningTaskCount}
        selectedKeyId={selectedKeyId}
        size={size}
        onClearReferences={clearReferences}
        onCountChange={setCount}
        onCustomSizeChange={setCustomSize}
        onReferenceUpload={handleReferenceUpload}
        onMobileParamsOpenChange={setMobileParamsOpen}
        onModelChange={setModel}
        onPromptChange={setPrompt}
        onQualityChange={setQuality}
        onRemoveReference={removeReference}
        onSelectedKeyChange={setSelectedKeyId}
        onSizeChange={setSize}
        onSubmit={submitCurrent}
      />

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      >
        <DialogContent className='max-h-[92dvh] w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-5xl'>
          <DialogHeader className='border-b px-4 py-3 text-left'>
            <DialogTitle>{t('Preview')}</DialogTitle>
          </DialogHeader>
          <div className='flex max-h-[calc(92dvh-4rem)] items-center justify-center overflow-auto bg-muted/40 p-3'>
            {previewImage && (
              <img
                src={previewImage.image.src}
                alt={previewImage.image.revisedPrompt || t('Generated image')}
                className='max-h-[calc(92dvh-6rem)] max-w-full rounded-lg object-contain'
              />
            )}
          </div>
          {previewImage && (
            <div className='flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={() =>
                  downloadImage(
                    previewImage.image.src,
                    `image-${previewImage.task?.id ?? previewImage.image.id}.png`
                  )
                }
              >
                <Download data-icon='inline-start' aria-hidden='true' />
                {t('Download')}
              </Button>
              {previewImage.task && (
                <Button
                  onClick={() => {
                    useGeneratedAsReference(previewImage.image, previewImage.task!)
                    setPreviewImage(null)
                  }}
                >
                  <Plus data-icon='inline-start' aria-hidden='true' />
                  {t('Use as reference')}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Confirm clear image tasks')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This will remove local image generation history. Continue?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={clearTasks}>
              {t('Clear tasks')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={keyGuideOpen} onOpenChange={setKeyGuideOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('No compatible image API keys available')}
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-2'>
              <span className='block'>
                {t(
                  'Create an API key with access to an image generation model before generating images.'
                )}
              </span>
              <span className='block'>
                {t(
                  'Use the API Key page to create a key in a group that includes {{model}}.',
                  { model }
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={openKeyCreation}>
              {t('Create image API key')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TaskGrid(props: {
  tasks: ImageTask[]
  hasFilters: boolean
  onCopyPrompt: (prompt: string) => void
  onDelete: (taskId: string) => void
  onDownload: (src: string, filename: string) => void
  onPreview: (image: GeneratedImage, task: ImageTask) => void
  onRetry: (task: ImageTask) => void
  onReusePrompt: (task: ImageTask) => void
  onUseAsReference: (image: GeneratedImage, task: ImageTask) => void
}) {
  const { t } = useTranslation()

  if (!props.tasks.length) {
    return (
      <div className='text-muted-foreground flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/60 text-center'>
        <ImageIcon className='size-14 text-muted-foreground/50' aria-hidden='true' />
        <div className='space-y-1 px-4'>
          <p className='text-sm font-medium'>
            {props.hasFilters ? t('No matching image tasks') : t('No image tasks yet')}
          </p>
          <p className='text-xs'>
            {props.hasFilters
              ? t('Try another keyword or status filter.')
              : t('Enter a prompt below to start generating images.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {props.tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onCopyPrompt={props.onCopyPrompt}
          onDelete={props.onDelete}
          onDownload={props.onDownload}
          onPreview={props.onPreview}
          onRetry={props.onRetry}
          onReusePrompt={props.onReusePrompt}
          onUseAsReference={props.onUseAsReference}
        />
      ))}
    </div>
  )
}

function TaskCard(props: {
  task: ImageTask
  onCopyPrompt: (prompt: string) => void
  onDelete: (taskId: string) => void
  onDownload: (src: string, filename: string) => void
  onPreview: (image: GeneratedImage, task: ImageTask) => void
  onRetry: (task: ImageTask) => void
  onReusePrompt: (task: ImageTask) => void
  onUseAsReference: (image: GeneratedImage, task: ImageTask) => void
}) {
  const { t } = useTranslation()
  const { task } = props
  const [now, setNow] = useState(Date.now())
  const cover = task.images[0] ?? null
  const duration =
    task.status === 'running'
      ? formatElapsed(now - task.createdAt)
      : formatElapsed(task.elapsed)
  const statusConfig = {
    running: {
      label: t('Generating...'),
      className: 'border-blue-400 ring-2 ring-blue-500/30',
      badge: 'bg-blue-500 text-white',
    },
    done: {
      label: t('Done'),
      className: 'border-border hover:border-foreground/20',
      badge: 'bg-emerald-500 text-white',
    },
    error: {
      label: t('Error'),
      className: 'border-destructive/40',
      badge: 'bg-destructive text-destructive-foreground',
    },
  }[task.status]

  useEffect(() => {
    if (task.status !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [task.status])

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border bg-background shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg',
        statusConfig.className
      )}
    >
      <div className='flex flex-col sm:h-40 sm:flex-row'>
        <button
          type='button'
          className='relative flex h-44 w-full shrink-0 items-center justify-center overflow-hidden bg-muted sm:h-full sm:w-40'
          disabled={!cover}
          onClick={() => cover && props.onPreview(cover, task)}
        >
          {task.status === 'running' && (
            <div className='flex flex-col items-center gap-2'>
              <Loader2 className='size-8 animate-spin text-blue-500' />
              <span className='text-muted-foreground text-xs'>
                {t('Generating...')}
              </span>
            </div>
          )}
          {task.status === 'error' && (
            <div className='flex flex-col items-center gap-1 px-3 text-center'>
              <X className='size-8 text-destructive' />
              <span className='text-destructive text-xs'>{t('Failed')}</span>
            </div>
          )}
          {task.status === 'done' && cover && (
            <img
              src={cover.src}
              alt={cover.revisedPrompt || task.prompt}
              className='size-full object-cover transition-transform group-hover:scale-105'
              loading='lazy'
            />
          )}
          {task.status === 'done' && task.images.length > 1 && (
            <span className='absolute right-1.5 bottom-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white'>
              {task.images.length}
            </span>
          )}
          <span className='absolute top-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm'>
            {duration}
          </span>
        </button>

        <div className='flex min-w-0 flex-1 flex-col p-3'>
          <div className='flex items-start justify-between gap-2'>
            <p className='line-clamp-3 min-h-14 text-sm leading-relaxed'>
              {task.prompt || t('Untitled')}
            </p>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                statusConfig.badge
              )}
            >
              {task.status === 'running' ? (
                <Loader2 className='size-3 animate-spin' />
              ) : task.status === 'done' ? (
                <Check className='size-3' />
              ) : (
                <X className='size-3' />
              )}
              {statusConfig.label}
            </span>
          </div>

          {task.status === 'error' && task.error && (
            <p className='text-destructive mt-1 line-clamp-2 text-xs'>
              {task.error}
            </p>
          )}

          <div className='mt-auto min-w-0 space-y-2'>
            <div className='flex min-w-0 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              <TaskTag>{task.model}</TaskTag>
              <TaskTag>
                {task.mode === 'edit' ? t('Image edit') : t('Text to image')}
              </TaskTag>
              <TaskTag>{task.size}</TaskTag>
              <TaskTag>{task.quality}</TaskTag>
              {task.n > 1 && <TaskTag>{task.n}</TaskTag>}
              {Boolean(task.referenceCount) && (
                <TaskTag>
                  {t('{{count}} reference images', {
                    count: task.referenceCount,
                  })}
                </TaskTag>
              )}
              <TaskTag>{task.apiKeyGroup}</TaskTag>
            </div>
            <div className='flex items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {cover && (
                <>
                  <IconAction
                    label={t('Preview')}
                    onClick={() => props.onPreview(cover, task)}
                  >
                    <Eye />
                  </IconAction>
                  <IconAction
                    label={t('Download')}
                    onClick={() =>
                      props.onDownload(cover.src, `image-${task.id}.png`)
                    }
                  >
                    <Download />
                  </IconAction>
                  <IconAction
                    label={t('Use as reference')}
                    onClick={() => props.onUseAsReference(cover, task)}
                  >
                    <Plus />
                  </IconAction>
                </>
              )}
              <IconAction
                label={t('Reuse prompt')}
                onClick={() => props.onReusePrompt(task)}
              >
                <RotateCcw />
              </IconAction>
              <IconAction
                label={t('Retry')}
                disabled={task.status === 'running'}
                onClick={() => props.onRetry(task)}
              >
                <RefreshCcw />
              </IconAction>
              <IconAction
                label={t('Copy prompt')}
                onClick={() => props.onCopyPrompt(task.prompt)}
              >
                <Copy />
              </IconAction>
              <IconAction
                label={t('Delete task')}
                disabled={task.status === 'running'}
                onClick={() => props.onDelete(task.id)}
              >
                <Trash2 />
              </IconAction>
            </div>
          </div>
        </div>
      </div>
      {task.images.length > 1 && (
        <div className='border-t bg-muted/30 p-2'>
          <div className='flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {task.images.map((image, index) => (
              <div
                key={image.id}
                className='group/image relative size-16 shrink-0 overflow-hidden rounded-lg border bg-background'
              >
                <button
                  type='button'
                  className='size-full'
                  onClick={() => props.onPreview(image, task)}
                  title={t('Preview')}
                >
                  <img
                    src={image.src}
                    alt={image.revisedPrompt || task.prompt}
                    className='size-full object-cover transition-transform group-hover/image:scale-105'
                    loading='lazy'
                  />
                  <span className='absolute top-1 left-1 rounded bg-black/55 px-1 text-[10px] text-white'>
                    {index + 1}
                  </span>
                </button>
                <div className='absolute right-1 bottom-1 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/image:opacity-100'>
                  <button
                    type='button'
                    className='flex size-6 items-center justify-center rounded bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-black/80'
                    onClick={() =>
                      props.onDownload(image.src, `image-${task.id}-${index + 1}.png`)
                    }
                    title={t('Download')}
                  >
                    <Download className='size-3.5' aria-hidden='true' />
                    <span className='sr-only'>{t('Download')}</span>
                  </button>
                  <button
                    type='button'
                    className='flex size-6 items-center justify-center rounded bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-black/80'
                    onClick={() => props.onUseAsReference(image, task)}
                    title={t('Use as reference')}
                  >
                    <Plus className='size-3.5' aria-hidden='true' />
                    <span className='sr-only'>{t('Use as reference')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskTag({ children }: { children: ReactNode }) {
  return (
    <span className='bg-muted text-muted-foreground inline-flex h-5 shrink-0 items-center rounded px-1.5 text-xs'>
      {children}
    </span>
  )
}

function IconAction(props: {
  children: ReactElement
  disabled?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant='ghost'
      size='icon-xs'
      disabled={props.disabled}
      onClick={(event) => {
        event.stopPropagation()
        props.onClick()
      }}
      title={props.label}
    >
      {props.children}
      <span className='sr-only'>{props.label}</span>
    </Button>
  )
}

function FloatingInputBar(props: {
  availableKeys: PlaygroundTokenOption[]
  canSubmit: boolean
  count: number
  customSize: string
  fileInputRef: RefObject<HTMLInputElement | null>
  isLoadingKeys: boolean
  mobileParamsOpen: boolean
  model: string
  modelOptions: string[]
  prompt: string
  promptRef: RefObject<HTMLTextAreaElement | null>
  quality: string
  referenceImages: ReferenceImage[]
  runningTaskCount: number
  selectedKeyId: number | null
  size: string
  onClearReferences: () => void
  onCountChange: (value: number) => void
  onCustomSizeChange: (value: string) => void
  onReferenceUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onMobileParamsOpenChange: (value: boolean) => void
  onModelChange: (value: string) => void
  onPromptChange: (value: string) => void
  onQualityChange: (value: string) => void
  onRemoveReference: (id: string) => void
  onSelectedKeyChange: (value: number | null) => void
  onSizeChange: (value: string) => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()
  const hasReferences = props.referenceImages.length > 0

  const params = (
    <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end'>
      <ParamSelect
        label={t('Model')}
        value={props.model}
        onChange={props.onModelChange}
      >
        {props.modelOptions.map((item) => (
          <NativeSelectOption key={item} value={item}>
            {item}
          </NativeSelectOption>
        ))}
      </ParamSelect>
      <ParamSelect
        label={t('API Key')}
        value={props.selectedKeyId?.toString() ?? ''}
        disabled={props.isLoadingKeys || props.availableKeys.length === 0}
        onChange={(value) =>
          props.onSelectedKeyChange(value ? Number(value) : null)
        }
      >
        {props.isLoadingKeys ? (
          <NativeSelectOption value=''>
            {t('Loading image keys...')}
          </NativeSelectOption>
        ) : props.availableKeys.length === 0 ? (
          <NativeSelectOption value=''>
            {t('No compatible image API keys available')}
          </NativeSelectOption>
        ) : (
          props.availableKeys.map((item) => (
            <NativeSelectOption key={item.id} value={item.id.toString()}>
              {getTokenLabel(item)} · {item.group} · {item.masked_key}
            </NativeSelectOption>
          ))
        )}
      </ParamSelect>
      <ParamSelect label={t('Size')} value={props.size} onChange={props.onSizeChange}>
        {SIZE_OPTIONS.map((item) => (
          <NativeSelectOption key={item} value={item}>
            {item === AUTO_SIZE_VALUE ? t('auto') : item}
          </NativeSelectOption>
        ))}
        <NativeSelectOption value={CUSTOM_SIZE_VALUE}>
          {t('Manual size')}
        </NativeSelectOption>
      </ParamSelect>
      {props.size === CUSTOM_SIZE_VALUE && (
        <div className='space-y-1 sm:w-36'>
          <Label htmlFor='image-generation-custom-size' className='text-xs'>
            {t('Custom size')}
          </Label>
          <Input
            id='image-generation-custom-size'
            className='h-8'
            value={props.customSize}
            placeholder={t('Enter custom size')}
            onChange={(event) =>
              props.onCustomSizeChange(event.target.value)
            }
          />
        </div>
      )}
      <ParamSelect
        label={t('Quality')}
        value={props.quality}
        onChange={props.onQualityChange}
      >
        {QUALITY_OPTIONS.map((item) => (
          <NativeSelectOption key={item} value={item}>
            {t(item)}
          </NativeSelectOption>
        ))}
      </ParamSelect>
      <div className='space-y-1 sm:w-20'>
        <Label htmlFor='image-generation-count' className='text-xs'>
          {t('Count')}
        </Label>
        <Input
          id='image-generation-count'
          className='h-8'
          type='number'
          min={1}
          max={4}
          value={props.count}
          onChange={(event) =>
            props.onCountChange(
              Math.min(4, Math.max(1, Number(event.target.value) || 1))
            )
          }
        />
      </div>
    </div>
  )

  return (
    <div
      data-input-bar
      className='pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6 sm:pb-5'
    >
      <div className='pointer-events-auto mx-auto max-w-5xl'>
        <div className='rounded-xl border bg-background/90 p-3 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-xl sm:p-4'>
          <input
            ref={props.fileInputRef}
            type='file'
            accept='image/*'
            multiple
            className='hidden'
            onChange={props.onReferenceUpload}
          />
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-200 sm:hidden',
              props.mobileParamsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
          >
            <div className='overflow-hidden'>
              <div className='pb-3 sm:pb-0'>{params}</div>
            </div>
          </div>

          {hasReferences && (
            <div className='mb-3 space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-muted-foreground truncate text-xs'>
                  {t('{{count}}/{{max}} reference images', {
                    count: props.referenceImages.length,
                    max: MAX_REFERENCE_IMAGES,
                  })}
                </p>
                <Button
                  variant='ghost'
                  size='xs'
                  onClick={props.onClearReferences}
                >
                  {t('Clear reference images')}
                </Button>
              </div>
              <div className='flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                {props.referenceImages.map((image) => (
                  <div
                    key={image.id}
                    className='group/reference relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted'
                    title={image.name}
                  >
                    <img
                      src={image.src}
                      alt={image.name || t('Reference image')}
                      className='size-full object-cover'
                    />
                    <Button
                      variant='destructive'
                      size='icon-xs'
                      className='absolute top-1 right-1 opacity-90 sm:opacity-0 sm:group-hover/reference:opacity-100'
                      onClick={() => props.onRemoveReference(image.id)}
                    >
                      <X />
                      <span className='sr-only'>
                        {t('Remove reference image')}
                      </span>
                    </Button>
                  </div>
                ))}
                {props.referenceImages.length < MAX_REFERENCE_IMAGES && (
                  <button
                    type='button'
                    className='border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed transition-colors'
                    onClick={() => props.fileInputRef.current?.click()}
                    title={t('Add reference image')}
                  >
                    <Upload className='size-4' aria-hidden='true' />
                    <span className='sr-only'>{t('Add reference image')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className='relative grid'>
            <Textarea
              ref={props.promptRef}
              value={props.prompt}
              className='min-h-16 resize-none rounded-lg pr-12 text-sm sm:min-h-20'
              placeholder={t('Describe the image you want to create')}
              onChange={(event) => props.onPromptChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  if (props.canSubmit) props.onSubmit()
                }
              }}
            />
            {props.prompt && (
              <Button
                variant='ghost'
                size='icon-xs'
                className='absolute top-2 right-2'
                onClick={() => props.onPromptChange('')}
              >
                <X />
                <span className='sr-only'>{t('Clear prompt')}</span>
              </Button>
            )}
          </div>

          <div className='mt-3 flex items-center justify-between gap-2'>
            <div className='hidden min-w-0 flex-1 sm:block'>{params}</div>
            <div className='flex min-w-0 flex-1 items-center gap-2 sm:min-w-fit sm:flex-none'>
              <Button
                variant='outline'
                size='icon'
                className='sm:hidden'
                onClick={() =>
                  props.onMobileParamsOpenChange(!props.mobileParamsOpen)
                }
              >
                {props.mobileParamsOpen ? <X /> : <SlidersHorizontal />}
                <span className='sr-only'>{t('Parameters')}</span>
              </Button>
              <Button
                variant='outline'
                size='icon'
                disabled={props.referenceImages.length >= MAX_REFERENCE_IMAGES}
                onClick={() => props.fileInputRef.current?.click()}
                title={t('Add reference image')}
              >
                <Upload />
                <span className='sr-only'>{t('Add reference image')}</span>
              </Button>
              <Button
                className='flex-1 sm:flex-none'
                disabled={!props.canSubmit}
                onClick={props.onSubmit}
              >
                {props.runningTaskCount > 0 ? (
                  <Loader2
                    data-icon='inline-start'
                    className='animate-spin'
                    aria-hidden='true'
                  />
                ) : (
                  <Send data-icon='inline-start' aria-hidden='true' />
                )}
                {props.runningTaskCount > 0
                  ? t('{{count}} running', { count: props.runningTaskCount })
                  : hasReferences
                    ? t('Edit Image')
                    : t('Generate Image')}
              </Button>
              <Button
                variant='outline'
                size='icon'
                onClick={() => props.promptRef.current?.focus()}
              >
                <Plus />
                <span className='sr-only'>{t('Focus prompt')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ParamSelect(props: {
  children: ReactNode
  disabled?: boolean
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className='space-y-1 sm:w-40'>
      <Label className='text-xs'>{props.label}</Label>
      <NativeSelect
        className='w-full'
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.children}
      </NativeSelect>
    </div>
  )
}

package common

import "strings"

var (
	// OpenAIResponseOnlyModels is a list of models that are only available for OpenAI responses.
	OpenAIResponseOnlyModels = []string{
		"o3-pro",
		"o3-deep-research",
		"o4-mini-deep-research",
		"codex",
	}
	ImageGenerationModels = []string{
		"dall-e-3",
		"dall-e-2",
		"gpt-image-1",
		"gpt-image-2",
		"prefix:imagen-",
		"flux-",
		"flux.1-",
	}
	OpenAITextModels = []string{
		"gpt-",
		"o1",
		"o3",
		"o4",
		"chatgpt",
	}
)

func IsOpenAIResponseOnlyModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	for _, m := range OpenAIResponseOnlyModels {
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}

func IsImageGenerationModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	for _, m := range ImageGenerationModels {
		if strings.Contains(modelName, m) {
			return true
		}
		if strings.HasPrefix(m, "prefix:") && strings.HasPrefix(modelName, strings.TrimPrefix(m, "prefix:")) {
			return true
		}
	}
	return false
}

func IsImageEditModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	return strings.Contains(modelName, "gpt-image-") ||
		strings.Contains(modelName, "dall-e-2")
}

func IsOpenAITextModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	for _, m := range OpenAITextModels {
		if strings.Contains(modelName, m) {
			return true
		}
	}
	return false
}

func IsEmbeddingModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	return strings.Contains(modelName, "embedding") ||
		strings.Contains(modelName, "embed") ||
		strings.HasPrefix(modelName, "m3e") ||
		strings.Contains(modelName, "bge-")
}

func IsRerankModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	return strings.Contains(modelName, "rerank") ||
		strings.Contains(modelName, "reranker")
}

func IsVideoGenerationModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	return strings.Contains(modelName, "sora") ||
		strings.Contains(modelName, "video") ||
		strings.Contains(modelName, "veo") ||
		strings.Contains(modelName, "kling") ||
		strings.Contains(modelName, "vidu") ||
		strings.Contains(modelName, "jimeng") ||
		strings.Contains(modelName, "seedance")
}

func IsAudioModel(modelName string) bool {
	modelName = strings.ToLower(modelName)
	return strings.Contains(modelName, "whisper") ||
		strings.Contains(modelName, "audio") ||
		strings.HasPrefix(modelName, "tts-")
}

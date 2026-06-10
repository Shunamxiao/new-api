package dto

type ImageGenerationTaskStatus string

const (
	ImageGenerationTaskStatusSubmitted ImageGenerationTaskStatus = "submitted"
	ImageGenerationTaskStatusRunning   ImageGenerationTaskStatus = "running"
	ImageGenerationTaskStatusDone      ImageGenerationTaskStatus = "done"
	ImageGenerationTaskStatusError     ImageGenerationTaskStatus = "error"
)

const (
	ImageGenerationActionGenerate = "IMAGE_GENERATION"
	ImageGenerationActionEdit     = "IMAGE_EDIT"
)

type ImageGenerationTaskInput struct {
	Mode           string `json:"mode"`
	Prompt         string `json:"prompt"`
	Model          string `json:"model"`
	Group          string `json:"group"`
	Size           string `json:"size"`
	Quality        string `json:"quality"`
	N              int    `json:"n"`
	TokenId        int    `json:"token_id"`
	ReferenceCount int    `json:"reference_count"`
}

type ImageGenerationTaskSubmitResponse struct {
	TaskID string                    `json:"task_id"`
	Status ImageGenerationTaskStatus `json:"status"`
}

type ImageGenerationTaskDto struct {
	TaskID         string                    `json:"task_id"`
	Status         ImageGenerationTaskStatus `json:"status"`
	Mode           string                    `json:"mode"`
	Prompt         string                    `json:"prompt"`
	Model          string                    `json:"model"`
	Group          string                    `json:"group"`
	Size           string                    `json:"size"`
	Quality        string                    `json:"quality"`
	N              int                       `json:"n"`
	ReferenceCount int                       `json:"reference_count"`
	Progress       string                    `json:"progress"`
	CreatedAt      int64                     `json:"created_at"`
	UpdatedAt      int64                     `json:"updated_at"`
	SubmitTime     int64                     `json:"submit_time"`
	StartTime      int64                     `json:"start_time"`
	FinishTime     int64                     `json:"finish_time"`
	ElapsedMs      int64                     `json:"elapsed_ms"`
	Images         []ImageData               `json:"images"`
	Error          string                    `json:"error,omitempty"`
}

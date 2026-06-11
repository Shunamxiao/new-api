package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

const imageGenerationTaskTimeout = 15 * time.Minute

type imageGenerationSubmitContext struct {
	Action      string
	Mode        string
	RelayPath   string
	ContentType string
	Body        []byte
	Playground  dto.PlayGroundRequest
	Input       dto.ImageGenerationTaskInput
}

type imageGenerationJSONPayload struct {
	Group          string `json:"group"`
	Model          string `json:"model"`
	TokenId        int    `json:"token_id"`
	Prompt         string `json:"prompt"`
	N              int    `json:"n"`
	Size           string `json:"size"`
	Quality        string `json:"quality"`
	ResponseFormat string `json:"response_format,omitempty"`
}

func CreateImageGenerationTask(c *gin.Context) {
	submitImageGenerationTask(c, dto.ImageGenerationActionGenerate)
}

func CreateImageEditTask(c *gin.Context) {
	submitImageGenerationTask(c, dto.ImageGenerationActionEdit)
}

func ListImageGenerationTasks(c *gin.Context) {
	limit := common.String2Int(c.DefaultQuery("limit", "20"))
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	tasks := model.TaskGetAllUserTask(
		c.GetInt("id"),
		0,
		limit,
		model.SyncTaskQueryParams{Platform: constant.TaskPlatformImageGeneration},
	)
	common.ApiSuccess(c, imageGenerationTasksToDto(tasks))
}

func GetImageGenerationTask(c *gin.Context) {
	taskID := c.Param("task_id")
	task, exist, err := model.GetByTaskId(c.GetInt("id"), taskID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !exist || task.Platform != constant.TaskPlatformImageGeneration {
		common.ApiError(c, errors.New("任务不存在"))
		return
	}
	common.ApiSuccess(c, imageGenerationTaskToDto(task))
}

func submitImageGenerationTask(c *gin.Context, action string) {
	submitCtx, err := buildImageGenerationSubmitContext(c, action)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	userID := c.GetInt("id")
	userCache, err := model.GetUserCache(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	token, err := model.GetTokenByIds(submitCtx.Playground.TokenId, userID)
	if err == nil {
		err = service.ValidatePlaygroundToken(userID, userCache.Group, submitCtx.Playground, token)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err = service.ValidatePlaygroundEndpoint(submitCtx.Playground, submitCtx.RelayPath); err != nil {
		common.ApiError(c, err)
		return
	}

	now := time.Now().Unix()
	inputBytes, err := common.Marshal(submitCtx.Input)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	task := &model.Task{
		CreatedAt:  now,
		UpdatedAt:  now,
		TaskID:     model.GenerateTaskID(),
		Platform:   constant.TaskPlatformImageGeneration,
		UserId:     userID,
		Group:      submitCtx.Playground.Group,
		Action:     action,
		Status:     model.TaskStatusSubmitted,
		SubmitTime: now,
		Progress:   "0%",
		Properties: model.Properties{
			Input:           string(inputBytes),
			OriginModelName: submitCtx.Playground.Model,
		},
		PrivateData: model.TaskPrivateData{
			TokenId: submitCtx.Playground.TokenId,
		},
	}
	if err = task.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	body := append([]byte(nil), submitCtx.Body...)
	contentType := submitCtx.ContentType
	relayPath := submitCtx.RelayPath
	taskID := task.TaskID
	gopool.Go(func() {
		runImageGenerationTask(taskID, userID, token.Id, submitCtx.Playground.Group, relayPath, contentType, body)
	})

	common.ApiSuccess(c, dto.ImageGenerationTaskSubmitResponse{
		TaskID: task.TaskID,
		Status: dto.ImageGenerationTaskStatusSubmitted,
	})
}

func buildImageGenerationSubmitContext(c *gin.Context, action string) (*imageGenerationSubmitContext, error) {
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return nil, err
	}
	body, err := storage.Bytes()
	if err != nil {
		return nil, err
	}
	contentType := c.Request.Header.Get("Content-Type")

	if action == dto.ImageGenerationActionEdit {
		return buildImageEditSubmitContext(c, body, contentType)
	}
	return buildImageTextSubmitContext(body, contentType)
}

func buildImageTextSubmitContext(body []byte, contentType string) (*imageGenerationSubmitContext, error) {
	var payload imageGenerationJSONPayload
	if err := common.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if payload.N <= 0 {
		payload.N = 1
	}
	if payload.ResponseFormat == "" {
		if shouldUseImageURLResponseFormat(payload.Model) {
			payload.ResponseFormat = "url"
		}
	} else if !shouldSendImageResponseFormat(payload.Model, payload.ResponseFormat) {
		payload.ResponseFormat = ""
	}
	normalizedBody, err := common.Marshal(payload)
	if err != nil {
		return nil, err
	}
	playground := dto.PlayGroundRequest{
		Group:   payload.Group,
		Model:   payload.Model,
		TokenId: payload.TokenId,
	}
	return &imageGenerationSubmitContext{
		Action:      dto.ImageGenerationActionGenerate,
		Mode:        "generate",
		RelayPath:   "/pg/images/generations",
		ContentType: contentType,
		Body:        normalizedBody,
		Playground:  playground,
		Input: dto.ImageGenerationTaskInput{
			Mode:    "generate",
			Prompt:  payload.Prompt,
			Model:   payload.Model,
			Group:   payload.Group,
			Size:    payload.Size,
			Quality: payload.Quality,
			N:       payload.N,
			TokenId: payload.TokenId,
		},
	}, nil
}

func buildImageEditSubmitContext(c *gin.Context, body []byte, contentType string) (*imageGenerationSubmitContext, error) {
	form, err := common.ParseMultipartFormReusable(c)
	if err != nil {
		return nil, err
	}
	n := common.String2Int(firstMultipartValue(form.Value, "n"))
	if n <= 0 {
		n = 1
	}
	tokenID := common.String2Int(firstMultipartValue(form.Value, "token_id"))
	group := firstMultipartValue(form.Value, "group")
	modelName := firstMultipartValue(form.Value, "model")
	prompt := firstMultipartValue(form.Value, "prompt")
	size := firstMultipartValue(form.Value, "size")
	quality := firstMultipartValue(form.Value, "quality")
	normalizedBody := body
	normalizedContentType := contentType
	responseFormat := firstMultipartValue(form.Value, "response_format")
	if responseFormat != "" && !shouldSendImageResponseFormat(modelName, responseFormat) {
		normalizedBody, normalizedContentType, err = rebuildImageEditMultipartBody(form, map[string]bool{
			"response_format": true,
		})
		if err != nil {
			return nil, err
		}
	}
	playground := dto.PlayGroundRequest{
		Group:   group,
		Model:   modelName,
		TokenId: tokenID,
	}
	return &imageGenerationSubmitContext{
		Action:      dto.ImageGenerationActionEdit,
		Mode:        "edit",
		RelayPath:   "/pg/images/edits",
		ContentType: normalizedContentType,
		Body:        normalizedBody,
		Playground:  playground,
		Input: dto.ImageGenerationTaskInput{
			Mode:           "edit",
			Prompt:         prompt,
			Model:          modelName,
			Group:          group,
			Size:           size,
			Quality:        quality,
			N:              n,
			TokenId:        tokenID,
			ReferenceCount: countImageEditReferences(form),
		},
	}, nil
}

func shouldUseImageURLResponseFormat(modelName string) bool {
	normalized := strings.ToLower(strings.TrimSpace(modelName))
	return strings.Contains(normalized, "dall-e")
}

func shouldSendImageResponseFormat(modelName string, responseFormat string) bool {
	normalized := strings.ToLower(strings.TrimSpace(responseFormat))
	if normalized == "" {
		return false
	}
	if normalized == "url" {
		return shouldUseImageURLResponseFormat(modelName)
	}
	return true
}

func rebuildImageEditMultipartBody(form *multipart.Form, skipFields map[string]bool) ([]byte, string, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	for key, values := range form.Value {
		if skipFields[key] {
			continue
		}
		for _, value := range values {
			if err := writer.WriteField(key, value); err != nil {
				_ = writer.Close()
				return nil, "", err
			}
		}
	}

	for _, files := range form.File {
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				_ = writer.Close()
				return nil, "", err
			}
			part, err := writer.CreatePart(fileHeader.Header)
			if err != nil {
				_ = file.Close()
				_ = writer.Close()
				return nil, "", err
			}
			if _, err = io.Copy(part, file); err != nil {
				_ = file.Close()
				_ = writer.Close()
				return nil, "", err
			}
			_ = file.Close()
		}
	}

	if err := writer.Close(); err != nil {
		return nil, "", err
	}
	return body.Bytes(), writer.FormDataContentType(), nil
}

func countImageEditReferences(form *multipart.Form) int {
	if form == nil || form.File == nil {
		return 0
	}
	count := 0
	for fieldName, files := range form.File {
		if fieldName == "image" || fieldName == "image[]" || strings.HasPrefix(fieldName, "image[") {
			count += len(files)
		}
	}
	return count
}

func runImageGenerationTask(taskID string, userID int, tokenID int, group string, relayPath string, contentType string, body []byte) {
	task, exist, err := mustGetImageGenerationTask(userID, taskID)
	if err != nil || !exist {
		logger.LogError(context.Background(), fmt.Sprintf("image generation task %s not found: %v", taskID, err))
		return
	}

	now := time.Now().Unix()
	task.Status = model.TaskStatusInProgress
	task.Progress = "10%"
	task.StartTime = now
	task.UpdatedAt = now
	if ok, updateErr := task.UpdateWithStatus(model.TaskStatusSubmitted); updateErr != nil || !ok {
		logger.LogError(context.Background(), fmt.Sprintf("image generation task %s start failed: %v", taskID, updateErr))
		return
	}

	responseBody, statusCode, execErr := executeImageGenerationRelay(userID, tokenID, group, relayPath, contentType, body)
	task, exist, err = mustGetImageGenerationTask(userID, taskID)
	if err != nil || !exist {
		logger.LogError(context.Background(), fmt.Sprintf("image generation task %s reload failed: %v", taskID, err))
		return
	}

	now = time.Now().Unix()
	task.UpdatedAt = now
	task.FinishTime = now
	task.Progress = "100%"
	if execErr != nil || statusCode >= http.StatusBadRequest {
		task.Status = model.TaskStatusFailure
		task.FailReason = normalizeImageGenerationTaskError(execErr, statusCode, responseBody)
		updateImageGenerationTaskFinal(task, model.TaskStatusInProgress)
		return
	}

	var imageResponse dto.ImageResponse
	if err = common.Unmarshal(responseBody, &imageResponse); err != nil {
		task.Status = model.TaskStatusFailure
		task.FailReason = "上游返回了无法解析的图片结果：" + err.Error()
		updateImageGenerationTaskFinal(task, model.TaskStatusInProgress)
		return
	}
	if !hasImageGenerationResult(imageResponse.Data) {
		task.Status = model.TaskStatusFailure
		task.FailReason = "上游未返回图片结果"
		updateImageGenerationTaskFinal(task, model.TaskStatusInProgress)
		return
	}
	task.Status = model.TaskStatusSuccess
	task.FailReason = ""
	task.SetData(imageResponse)
	updateImageGenerationTaskFinal(task, model.TaskStatusInProgress)
}

func updateImageGenerationTaskFinal(task *model.Task, fromStatus model.TaskStatus) {
	ok, err := task.UpdateWithStatus(fromStatus)
	if err != nil {
		logger.LogError(context.Background(), fmt.Sprintf("image generation task %s final update failed: %v", task.TaskID, err))
		return
	}
	if ok {
		return
	}
	current, exist, reloadErr := mustGetImageGenerationTask(task.UserId, task.TaskID)
	if reloadErr != nil || !exist {
		logger.LogError(context.Background(), fmt.Sprintf("image generation task %s final update lost CAS and reload failed: %v", task.TaskID, reloadErr))
		return
	}
	if isImageGenerationPollingRaceFailure(current) {
		recovered, recoverErr := task.UpdateWithStatusAndFailReason(model.TaskStatusFailure, imageGenerationPollingRaceFailReasons())
		if recoverErr != nil {
			logger.LogError(context.Background(), fmt.Sprintf("image generation task %s polling race recovery failed: %v", task.TaskID, recoverErr))
			return
		}
		if recovered {
			logger.LogWarn(context.Background(), fmt.Sprintf("image generation task %s recovered from generic polling failure", task.TaskID))
			return
		}
	}
	logger.LogWarn(context.Background(), fmt.Sprintf("image generation task %s final update skipped by CAS, expected %s, current status %s, current fail reason: %s", task.TaskID, fromStatus, current.Status, current.FailReason))
}

func isImageGenerationPollingRaceFailure(task *model.Task) bool {
	if task == nil || task.Status != model.TaskStatusFailure {
		return false
	}
	for _, reason := range imageGenerationPollingRaceFailReasons() {
		if task.FailReason == reason {
			return true
		}
	}
	return false
}

func imageGenerationPollingRaceFailReasons() []string {
	return []string{
		"Failed to get channel info, channel ID: 0",
		"获取渠道信息失败，请联系管理员，渠道ID：0",
	}
}

func executeImageGenerationRelay(userID int, tokenID int, group string, relayPath string, contentType string, body []byte) ([]byte, int, error) {
	token, err := model.GetTokenByIds(tokenID, userID)
	if err != nil {
		return nil, http.StatusForbidden, err
	}
	userCache, err := model.GetUserCache(userID)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), imageGenerationTaskTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, relayPath, bytes.NewReader(body))
	if err != nil {
		return nil, http.StatusBadRequest, err
	}
	request.Header.Set("Content-Type", contentType)
	request.Header.Set("Accept", "application/json")

	recorder := httptest.NewRecorder()
	engine := gin.New()
	engine.Use(middleware.BodyStorageCleanup())
	engine.Use(func(c *gin.Context) {
		c.Set("id", userID)
		userCache.WriteContext(c)
		if setupErr := middleware.SetupContextForToken(c, token); setupErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": setupErr.Error()}})
			c.Abort()
			return
		}
		common.SetContextKey(c, constant.ContextKeyUsingGroup, group)
		common.SetContextKey(c, constant.ContextKeyTokenGroup, token.Group)
		common.SetContextKey(c, constant.ContextKeyPlaygroundBillTokenQuota, true)
		c.Next()
	})
	engine.Use(middleware.Distribute())
	engine.POST("/pg/images/generations", func(c *gin.Context) {
		PlaygroundRelay(c, types.RelayFormatOpenAIImage)
	})
	engine.POST("/pg/images/edits", func(c *gin.Context) {
		PlaygroundRelay(c, types.RelayFormatOpenAIImage)
	})

	engine.ServeHTTP(recorder, request)
	return recorder.Body.Bytes(), recorder.Code, ctx.Err()
}

func mustGetImageGenerationTask(userID int, taskID string) (*model.Task, bool, error) {
	task, exist, err := model.GetByTaskId(userID, taskID)
	if err != nil || !exist {
		return task, exist, err
	}
	if task.Platform != constant.TaskPlatformImageGeneration {
		return nil, false, nil
	}
	return task, true, nil
}

func normalizeImageGenerationTaskError(err error, statusCode int, responseBody []byte) string {
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return "上游生成超时，请稍后重试或联系管理员检查渠道"
		}
		return err.Error()
	}
	var payload struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
		Message string `json:"message"`
	}
	_ = common.Unmarshal(responseBody, &payload)
	message := payload.Error.Message
	if message == "" {
		message = payload.Message
	}
	if message == "" {
		message = strings.TrimSpace(string(responseBody))
	}
	if message == "" {
		message = fmt.Sprintf("请求失败，状态码 %d", statusCode)
	}
	normalized := strings.ToLower(message)
	if strings.Contains(normalized, "524") ||
		strings.Contains(normalized, "timeout") ||
		strings.Contains(normalized, "cloudflare") ||
		strings.Contains(normalized, "bad response status code") {
		return "上游渠道超时，请稍后重试或联系管理员检查渠道"
	}
	return message
}

func hasImageGenerationResult(items []dto.ImageData) bool {
	for _, item := range items {
		if strings.TrimSpace(item.Url) != "" || strings.TrimSpace(item.B64Json) != "" {
			return true
		}
	}
	return false
}

func imageGenerationTasksToDto(tasks []*model.Task) []*dto.ImageGenerationTaskDto {
	items := make([]*dto.ImageGenerationTaskDto, 0, len(tasks))
	for _, task := range tasks {
		items = append(items, imageGenerationTaskToDto(task))
	}
	return items
}

func imageGenerationTaskToDto(task *model.Task) *dto.ImageGenerationTaskDto {
	input := getImageGenerationTaskInput(task)
	imageResponse := dto.ImageResponse{}
	errorMessage := ""
	if task.Status == model.TaskStatusFailure {
		errorMessage = task.FailReason
	}
	if task.Status == model.TaskStatusSuccess {
		if len(task.Data) == 0 {
			errorMessage = "上游未返回图片结果"
		} else if err := task.GetData(&imageResponse); err != nil {
			errorMessage = "上游返回了无法解析的图片结果：" + err.Error()
		} else if !hasImageGenerationResult(imageResponse.Data) {
			errorMessage = "上游未返回图片结果"
		}
	}
	status := mapImageGenerationTaskStatus(task.Status)
	if task.Status == model.TaskStatusSuccess && errorMessage != "" {
		status = dto.ImageGenerationTaskStatusError
	}
	return &dto.ImageGenerationTaskDto{
		TaskID:         task.TaskID,
		Status:         status,
		Mode:           input.Mode,
		Prompt:         input.Prompt,
		Model:          input.Model,
		Group:          input.Group,
		Size:           input.Size,
		Quality:        input.Quality,
		N:              input.N,
		ReferenceCount: input.ReferenceCount,
		Progress:       task.Progress,
		CreatedAt:      task.CreatedAt,
		UpdatedAt:      task.UpdatedAt,
		SubmitTime:     task.SubmitTime,
		StartTime:      task.StartTime,
		FinishTime:     task.FinishTime,
		ElapsedMs:      getImageGenerationTaskElapsedMs(task),
		Images:         imageResponse.Data,
		Error:          errorMessage,
	}
}

func getImageGenerationTaskInput(task *model.Task) dto.ImageGenerationTaskInput {
	input := dto.ImageGenerationTaskInput{}
	if task.Properties.Input != "" {
		_ = common.Unmarshal([]byte(task.Properties.Input), &input)
	}
	if input.Mode == "" {
		if task.Action == dto.ImageGenerationActionEdit {
			input.Mode = "edit"
		} else {
			input.Mode = "generate"
		}
	}
	if input.N <= 0 {
		input.N = 1
	}
	return input
}

func mapImageGenerationTaskStatus(status model.TaskStatus) dto.ImageGenerationTaskStatus {
	switch status {
	case model.TaskStatusSubmitted, model.TaskStatusQueued:
		return dto.ImageGenerationTaskStatusSubmitted
	case model.TaskStatusInProgress:
		return dto.ImageGenerationTaskStatusRunning
	case model.TaskStatusSuccess:
		return dto.ImageGenerationTaskStatusDone
	case model.TaskStatusFailure:
		return dto.ImageGenerationTaskStatusError
	default:
		return dto.ImageGenerationTaskStatusError
	}
}

func getImageGenerationTaskElapsedMs(task *model.Task) int64 {
	if task.StartTime <= 0 {
		return 0
	}
	end := task.FinishTime
	if end <= 0 {
		end = time.Now().Unix()
	}
	return (end - task.StartTime) * 1000
}

func firstMultipartValue(values map[string][]string, key string) string {
	items := values[key]
	if len(items) == 0 {
		return ""
	}
	return items[0]
}

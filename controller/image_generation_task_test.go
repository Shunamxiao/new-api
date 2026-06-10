package controller

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type imageGenerationAPIResponse[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

func setupImageGenerationTaskControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	model.DB = db
	model.LOG_DB = db
	require.NoError(t, db.AutoMigrate(&model.Task{}))

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func TestBuildImageTextSubmitContextDefaultsResponseFormat(t *testing.T) {
	body := []byte(`{"group":"image","model":"gpt-image-2","token_id":7,"prompt":"draw a city","size":"auto","quality":"auto"}`)

	submitCtx, err := buildImageTextSubmitContext(body, "application/json")

	require.NoError(t, err)
	require.Equal(t, "/pg/images/generations", submitCtx.RelayPath)
	require.Equal(t, "generate", submitCtx.Input.Mode)
	require.Equal(t, 1, submitCtx.Input.N)
	require.Equal(t, 7, submitCtx.Playground.TokenId)

	payload := imageGenerationJSONPayload{}
	require.NoError(t, common.Unmarshal(submitCtx.Body, &payload))
	require.Equal(t, "url", payload.ResponseFormat)
	require.Equal(t, 1, payload.N)
}

func TestBuildImageEditSubmitContextParsesMultipart(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("group", "image"))
	require.NoError(t, writer.WriteField("model", "gpt-image-2"))
	require.NoError(t, writer.WriteField("token_id", "12"))
	require.NoError(t, writer.WriteField("prompt", "make it cinematic"))
	require.NoError(t, writer.WriteField("size", "auto"))
	require.NoError(t, writer.WriteField("quality", "auto"))
	fileWriter, err := writer.CreateFormFile("image", "reference.png")
	require.NoError(t, err)
	_, err = fileWriter.Write([]byte("fake image bytes"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	request := httptest.NewRequest(http.MethodPost, "/api/image-generation/tasks/edits", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = request

	submitCtx, err := buildImageGenerationSubmitContext(c, dto.ImageGenerationActionEdit)

	require.NoError(t, err)
	require.Equal(t, "/pg/images/edits", submitCtx.RelayPath)
	require.Equal(t, "edit", submitCtx.Input.Mode)
	require.Equal(t, "make it cinematic", submitCtx.Input.Prompt)
	require.Equal(t, 12, submitCtx.Input.TokenId)
	require.Equal(t, 1, submitCtx.Input.ReferenceCount)

	form, err := common.ParseMultipartFormReusable(c)
	require.NoError(t, err)
	require.Equal(t, "gpt-image-2", form.Value["model"][0])
	require.Len(t, form.File["image"], 1)
}

func TestImageGenerationTaskToDtoReturnsStoredImages(t *testing.T) {
	inputBytes, err := common.Marshal(dto.ImageGenerationTaskInput{
		Mode:           "generate",
		Prompt:         "draw a city",
		Model:          "gpt-image-2",
		Group:          "image",
		Size:           "auto",
		Quality:        "auto",
		N:              1,
		ReferenceCount: 0,
	})
	require.NoError(t, err)
	now := time.Now().Unix()
	task := &model.Task{
		TaskID:     "task_success",
		Platform:   constant.TaskPlatformImageGeneration,
		UserId:     1,
		Group:      "image",
		Action:     dto.ImageGenerationActionGenerate,
		Status:     model.TaskStatusSuccess,
		FailReason: "Failed to get channel info, channel ID: 0",
		SubmitTime: now - 3,
		StartTime:  now - 2,
		FinishTime: now,
		Progress:   "100%",
		Properties: model.Properties{Input: string(inputBytes)},
	}
	task.SetData(dto.ImageResponse{
		Created: now,
		Data: []dto.ImageData{{
			Url:           "https://example.com/image.png",
			RevisedPrompt: "draw a bright city",
		}},
	})

	item := imageGenerationTaskToDto(task)

	require.Equal(t, dto.ImageGenerationTaskStatusDone, item.Status)
	require.Equal(t, int64(2000), item.ElapsedMs)
	require.Len(t, item.Images, 1)
	require.Empty(t, item.Error)
	require.Equal(t, "https://example.com/image.png", item.Images[0].Url)
	require.Equal(t, "draw a bright city", item.Images[0].RevisedPrompt)
}

func TestListImageGenerationTasksOnlyReturnsCurrentUserImageTasks(t *testing.T) {
	db := setupImageGenerationTaskControllerTestDB(t)
	now := time.Now().Unix()
	tasks := []*model.Task{
		makeImageGenerationTaskForTest("task_own", 1, constant.TaskPlatformImageGeneration, now),
		makeImageGenerationTaskForTest("task_other_user", 2, constant.TaskPlatformImageGeneration, now),
		makeImageGenerationTaskForTest("task_other_platform", 1, constant.TaskPlatformSuno, now),
	}
	require.NoError(t, db.Create(tasks).Error)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("id", 1)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/image-generation/tasks?limit=20", nil)

	ListImageGenerationTasks(c)

	var response imageGenerationAPIResponse[[]*dto.ImageGenerationTaskDto]
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	require.True(t, response.Success)
	require.Len(t, response.Data, 1)
	require.Equal(t, "task_own", response.Data[0].TaskID)
}

func TestGetImageGenerationTaskRejectsOtherUserTask(t *testing.T) {
	db := setupImageGenerationTaskControllerTestDB(t)
	now := time.Now().Unix()
	require.NoError(t, db.Create(makeImageGenerationTaskForTest("task_other_user", 2, constant.TaskPlatformImageGeneration, now)).Error)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Set("id", 1)
	c.Params = gin.Params{{Key: "task_id", Value: "task_other_user"}}
	c.Request = httptest.NewRequest(http.MethodGet, "/api/image-generation/tasks/task_other_user", nil)

	GetImageGenerationTask(c)

	var response imageGenerationAPIResponse[*dto.ImageGenerationTaskDto]
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	require.False(t, response.Success)
	require.Equal(t, "任务不存在", response.Message)
}

func makeImageGenerationTaskForTest(taskID string, userID int, platform constant.TaskPlatform, now int64) *model.Task {
	inputBytes, _ := common.Marshal(dto.ImageGenerationTaskInput{
		Mode:    "generate",
		Prompt:  "draw a city",
		Model:   "gpt-image-2",
		Group:   "image",
		Size:    "auto",
		Quality: "auto",
		N:       1,
	})
	return &model.Task{
		CreatedAt:  now,
		UpdatedAt:  now,
		TaskID:     taskID,
		Platform:   platform,
		UserId:     userID,
		Group:      "image",
		Action:     dto.ImageGenerationActionGenerate,
		Status:     model.TaskStatusSubmitted,
		SubmitTime: now,
		Progress:   "0%",
		Properties: model.Properties{Input: string(inputBytes)},
	}
}

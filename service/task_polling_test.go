package service

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"

	"github.com/stretchr/testify/require"
)

func TestFilterGenericPollingTaskIDsSkipsImageGeneration(t *testing.T) {
	taskIDs := []string{"upstream-image", "upstream-video"}
	taskM := map[string]*model.Task{
		"upstream-image": {
			TaskID:   "task_image",
			Platform: constant.TaskPlatformImageGeneration,
		},
		"upstream-video": {
			TaskID:   "task_video",
			Platform: "doubao_video",
		},
	}

	filtered := filterGenericPollingTaskIDs(taskIDs, taskM)

	require.Equal(t, []string{"upstream-video"}, filtered)
}

package common

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
)

func TestGetEndpointTypesByChannelTypeGptImage2(t *testing.T) {
	endpoints := GetEndpointTypesByChannelType(0, "gpt-image-2")
	if len(endpoints) == 0 || endpoints[0] != constant.EndpointTypeImageGeneration {
		t.Fatalf("gpt-image-2 endpoints = %#v, want image-generation first", endpoints)
	}
}

func TestGetEndpointTypesByChannelTypeSpecializedModels(t *testing.T) {
	tests := []struct {
		modelName string
		want      constant.EndpointType
	}{
		{"text-embedding-3-small", constant.EndpointTypeEmbeddings},
		{"bge-reranker-large", constant.EndpointTypeJinaRerank},
		{"sora-2", constant.EndpointTypeOpenAIVideo},
		{"codex-mini-latest", constant.EndpointTypeOpenAIResponse},
	}

	for _, test := range tests {
		endpoints := GetEndpointTypesByChannelType(constant.ChannelTypeOpenAI, test.modelName)
		if len(endpoints) != 1 || endpoints[0] != test.want {
			t.Fatalf("%s endpoints = %#v, want %#v", test.modelName, endpoints, []constant.EndpointType{test.want})
		}
	}
}

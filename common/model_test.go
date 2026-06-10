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

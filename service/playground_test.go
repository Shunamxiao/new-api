package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"

	"github.com/stretchr/testify/require"
)

func resetPlaygroundTestData(t *testing.T) {
	t.Helper()
	require.NoError(t, model.DB.Exec("DELETE FROM abilities").Error)
	require.NoError(t, model.DB.Exec("DELETE FROM tokens").Error)
	model.InvalidatePricingCache()
	t.Cleanup(func() {
		model.DB.Exec("DELETE FROM abilities")
		model.DB.Exec("DELETE FROM tokens")
		model.InvalidatePricingCache()
	})
}

func seedPlaygroundAbility(t *testing.T, group, modelName string) {
	t.Helper()
	priority := int64(1)
	require.NoError(t, model.DB.Create(&model.Ability{
		Group:     group,
		Model:     modelName,
		ChannelId: 1,
		Enabled:   true,
		Priority:  &priority,
		Weight:    1,
	}).Error)
}

func makePlaygroundToken(id, userId int, group string) *model.Token {
	return &model.Token{
		Id:             id,
		UserId:         userId,
		Key:            "playground-test-key",
		Name:           "playground-test-token",
		Status:         common.TokenStatusEnabled,
		ExpiredTime:    -1,
		RemainQuota:    100,
		UnlimitedQuota: false,
		Group:          group,
	}
}

func TestValidatePlaygroundTokenAcceptsUsableToken(t *testing.T) {
	resetPlaygroundTestData(t)
	seedPlaygroundAbility(t, "default", "gpt-image-2")
	token := makePlaygroundToken(1001, 2001, "default")

	err := ValidatePlaygroundToken(2001, "default", dto.PlayGroundRequest{
		TokenId: token.Id,
		Group:   "default",
		Model:   "gpt-image-2",
	}, token)

	require.NoError(t, err)
}

func TestValidatePlaygroundTokenRejectsInvalidTokenStates(t *testing.T) {
	resetPlaygroundTestData(t)
	seedPlaygroundAbility(t, "default", "gpt-image-2")

	tests := []struct {
		name   string
		mutate func(*model.Token)
	}{
		{
			name: "disabled",
			mutate: func(token *model.Token) {
				token.Status = common.TokenStatusDisabled
			},
		},
		{
			name: "expired",
			mutate: func(token *model.Token) {
				token.ExpiredTime = common.GetTimestamp() - 1
			},
		},
		{
			name: "exhausted",
			mutate: func(token *model.Token) {
				token.RemainQuota = 0
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			token := makePlaygroundToken(1001, 2001, "default")
			test.mutate(token)

			err := ValidatePlaygroundToken(2001, "default", dto.PlayGroundRequest{
				TokenId: token.Id,
				Group:   "default",
				Model:   "gpt-image-2",
			}, token)

			require.Error(t, err)
		})
	}
}

func TestValidatePlaygroundTokenRejectsOwnershipAndGroupMismatch(t *testing.T) {
	resetPlaygroundTestData(t)
	seedPlaygroundAbility(t, "default", "gpt-image-2")
	seedPlaygroundAbility(t, "vip", "gpt-image-2")

	token := makePlaygroundToken(1001, 2001, "default")

	err := ValidatePlaygroundToken(2002, "default", dto.PlayGroundRequest{
		TokenId: token.Id,
		Group:   "default",
		Model:   "gpt-image-2",
	}, token)
	require.Error(t, err)

	err = ValidatePlaygroundToken(2001, "default", dto.PlayGroundRequest{
		TokenId: token.Id,
		Group:   "vip",
		Model:   "gpt-image-2",
	}, token)
	require.Error(t, err)
}

func TestValidatePlaygroundTokenUsesFormattedModelLimits(t *testing.T) {
	resetPlaygroundTestData(t)
	seedPlaygroundAbility(t, "default", "gpt-4-gizmo-alpha")
	seedPlaygroundAbility(t, "default", "gpt-image-2")

	token := makePlaygroundToken(1001, 2001, "default")
	token.ModelLimitsEnabled = true
	token.ModelLimits = "gpt-4-gizmo-*"

	err := ValidatePlaygroundToken(2001, "default", dto.PlayGroundRequest{
		TokenId: token.Id,
		Group:   "default",
		Model:   "gpt-4-gizmo-alpha",
	}, token)
	require.NoError(t, err)

	err = ValidatePlaygroundToken(2001, "default", dto.PlayGroundRequest{
		TokenId: token.Id,
		Group:   "default",
		Model:   "gpt-image-2",
	}, token)
	require.Error(t, err)
}

func TestBuildPlaygroundOptionsReturnsUsableMaskedTokens(t *testing.T) {
	resetPlaygroundTestData(t)
	seedPlaygroundAbility(t, "default", "gpt-image-2")

	usable := makePlaygroundToken(1001, 2001, "default")
	usable.Key = "abcd1234efgh5678"
	limited := makePlaygroundToken(1002, 2001, "default")
	limited.Key = "limited12345678"
	limited.ModelLimitsEnabled = true
	limited.ModelLimits = "gpt-4o"
	disabled := makePlaygroundToken(1003, 2001, "default")
	disabled.Status = common.TokenStatusDisabled
	require.NoError(t, model.DB.Create([]*model.Token{usable, limited, disabled}).Error)

	options, err := BuildPlaygroundOptions(2001, "default")

	require.NoError(t, err)
	require.Contains(t, options.GroupModels["default"], "gpt-image-2")
	require.Len(t, options.Tokens, 1)
	require.Equal(t, usable.Id, options.Tokens[0].Id)
	require.Equal(t, usable.GetMaskedKey(), options.Tokens[0].MaskedKey)
	require.NotEqual(t, usable.Key, options.Tokens[0].MaskedKey)
	require.Equal(t, []string{"gpt-image-2"}, options.Tokens[0].AllowedModels)
	require.Equal(
		t,
		[]string{string(constant.EndpointTypeImageGeneration), string(constant.EndpointTypeImageEdit)},
		options.ModelEndpoints["gpt-image-2"],
	)
}

func TestValidatePlaygroundEndpointChecksRouteCompatibility(t *testing.T) {
	resetPlaygroundTestData(t)

	require.NoError(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "gpt-4o",
	}, "/pg/chat/completions"))
	require.NoError(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "gpt-image-2",
	}, "/pg/images/generations"))
	require.NoError(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "gpt-image-2",
	}, "/pg/images/edits"))

	require.Error(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "gpt-image-2",
	}, "/pg/chat/completions"))
	require.Error(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "text-embedding-3-small",
	}, "/pg/chat/completions"))
	require.Error(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "gpt-4o",
	}, "/pg/images/generations"))
	require.Error(t, ValidatePlaygroundEndpoint(dto.PlayGroundRequest{
		Model: "dall-e-3",
	}, "/pg/images/edits"))
}

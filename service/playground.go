package service

import (
	"errors"
	"sort"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

type PlaygroundGroupOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Ratio any    `json:"ratio"`
	Desc  string `json:"desc,omitempty"`
}

type PlaygroundTokenOption struct {
	Id                 int      `json:"id"`
	Name               string   `json:"name"`
	MaskedKey          string   `json:"masked_key"`
	Group              string   `json:"group"`
	Status             int      `json:"status"`
	RemainQuota        int      `json:"remain_quota"`
	UnlimitedQuota     bool     `json:"unlimited_quota"`
	ModelLimitsEnabled bool     `json:"model_limits_enabled"`
	ModelLimits        string   `json:"model_limits"`
	AllowedModels      []string `json:"allowed_models"`
}

type PlaygroundOptions struct {
	Groups      []PlaygroundGroupOption `json:"groups"`
	GroupModels map[string][]string     `json:"group_models"`
	Tokens      []PlaygroundTokenOption `json:"tokens"`
}

func BuildPlaygroundOptions(userId int, userGroup string) (*PlaygroundOptions, error) {
	groups := buildPlaygroundGroupOptions(userGroup)
	groupModels := buildPlaygroundGroupModels(groups, userGroup)
	tokens, err := model.GetAllUserTokens(userId, 0, 10000)
	if err != nil {
		return nil, err
	}

	tokenOptions := make([]PlaygroundTokenOption, 0, len(tokens))
	for _, token := range tokens {
		if token == nil || !IsPlaygroundTokenUsable(token) {
			continue
		}
		modelsForGroup := groupModels[token.Group]
		if len(modelsForGroup) == 0 {
			continue
		}
		allowedModels := FilterPlaygroundTokenModels(token, modelsForGroup)
		if len(allowedModels) == 0 {
			continue
		}
		tokenOptions = append(tokenOptions, PlaygroundTokenOption{
			Id:                 token.Id,
			Name:               token.Name,
			MaskedKey:          token.GetMaskedKey(),
			Group:              token.Group,
			Status:             token.Status,
			RemainQuota:        token.RemainQuota,
			UnlimitedQuota:     token.UnlimitedQuota,
			ModelLimitsEnabled: token.ModelLimitsEnabled,
			ModelLimits:        token.ModelLimits,
			AllowedModels:      allowedModels,
		})
	}

	return &PlaygroundOptions{
		Groups:      groups,
		GroupModels: groupModels,
		Tokens:      tokenOptions,
	}, nil
}

func buildPlaygroundGroupOptions(userGroup string) []PlaygroundGroupOption {
	userUsableGroups := GetUserUsableGroups(userGroup)
	groups := make([]PlaygroundGroupOption, 0, len(userUsableGroups))
	for groupName := range ratio_setting.GetGroupRatioCopy() {
		desc, ok := userUsableGroups[groupName]
		if !ok {
			continue
		}
		groups = append(groups, PlaygroundGroupOption{
			Label: groupName,
			Value: groupName,
			Ratio: GetUserGroupRatio(userGroup, groupName),
			Desc:  desc,
		})
	}
	if _, ok := userUsableGroups["auto"]; ok {
		groups = append(groups, PlaygroundGroupOption{
			Label: "auto",
			Value: "auto",
			Ratio: "自动",
			Desc:  setting.GetUsableGroupDescription("auto"),
		})
	}
	sort.SliceStable(groups, func(i, j int) bool {
		if groups[i].Value == "default" {
			return true
		}
		if groups[j].Value == "default" {
			return false
		}
		if groups[i].Value == "auto" {
			return false
		}
		if groups[j].Value == "auto" {
			return true
		}
		return groups[i].Value < groups[j].Value
	})
	return groups
}

func buildPlaygroundGroupModels(groups []PlaygroundGroupOption, userGroup string) map[string][]string {
	groupModels := make(map[string][]string, len(groups))
	for _, group := range groups {
		models := GetPlaygroundModelsForGroup(group.Value, userGroup)
		sort.Strings(models)
		groupModels[group.Value] = models
	}
	return groupModels
}

func IsPlaygroundTokenUsable(token *model.Token) bool {
	if token == nil {
		return false
	}
	if token.Status != common.TokenStatusEnabled {
		return false
	}
	if token.ExpiredTime != -1 && token.ExpiredTime < common.GetTimestamp() {
		return false
	}
	if !token.UnlimitedQuota && token.RemainQuota <= 0 {
		return false
	}
	if token.Group == "" {
		return false
	}
	return true
}

func FilterPlaygroundTokenModels(token *model.Token, models []string) []string {
	if token == nil || len(models) == 0 {
		return nil
	}
	allowed := make([]string, 0, len(models))
	if !token.ModelLimitsEnabled {
		allowed = append(allowed, models...)
		return allowed
	}
	modelLimit := token.GetModelLimitsMap()
	for _, modelName := range models {
		matchName := ratio_setting.FormatMatchingModelName(modelName)
		if modelLimit[matchName] {
			allowed = append(allowed, modelName)
		}
	}
	return allowed
}

func ValidatePlaygroundToken(userId int, userGroup string, req dto.PlayGroundRequest, token *model.Token) error {
	if req.TokenId <= 0 {
		return errors.New("请选择可用的 API 密钥")
	}
	if req.Group == "" {
		return errors.New("请选择分组")
	}
	if req.Model == "" {
		return errors.New("请选择模型")
	}
	if token == nil || token.Id != req.TokenId || token.UserId != userId {
		return errors.New("API 密钥不存在或无权使用")
	}
	if !IsPlaygroundTokenUsable(token) {
		return errors.New("API 密钥已禁用、过期或额度不足")
	}
	if !GroupInUserUsableGroups(userGroup, req.Group) && req.Group != userGroup {
		return errors.New("当前用户无权使用所选分组")
	}
	if token.Group != req.Group {
		return errors.New("API 密钥分组与当前分组不匹配")
	}
	models := GetPlaygroundModelsForGroup(req.Group, userGroup)
	if len(models) == 0 {
		return errors.New("当前分组没有可用模型")
	}
	allowedModels := FilterPlaygroundTokenModels(token, models)
	for _, modelName := range allowedModels {
		if modelName == req.Model {
			return nil
		}
	}
	return errors.New("API 密钥不允许使用当前模型")
}

func GetPlaygroundModelsForGroup(group string, userGroup string) []string {
	if group != "auto" {
		return model.GetGroupEnabledModels(group)
	}
	seen := make(map[string]struct{})
	models := make([]string, 0)
	for _, autoGroup := range GetUserAutoGroup(userGroup) {
		for _, modelName := range model.GetGroupEnabledModels(autoGroup) {
			if _, ok := seen[modelName]; ok {
				continue
			}
			seen[modelName] = struct{}{}
			models = append(models, modelName)
		}
	}
	sort.Strings(models)
	return models
}

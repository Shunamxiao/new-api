package dto

type PlayGroundRequest struct {
	Model   string `json:"model,omitempty"`
	Group   string `json:"group,omitempty"`
	TokenId int    `json:"token_id,omitempty"`
}

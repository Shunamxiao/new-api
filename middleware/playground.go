package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

func PlaygroundTokenAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		req := dto.PlayGroundRequest{}
		if err := common.UnmarshalBodyReusable(c, &req); err != nil {
			abortWithOpenAiMessage(c, http.StatusBadRequest, err.Error(), types.ErrorCodeInvalidRequest)
			return
		}

		userCache, err := model.GetUserCache(c.GetInt("id"))
		if err != nil {
			abortWithOpenAiMessage(c, http.StatusInternalServerError, err.Error(), types.ErrorCodeQueryDataError)
			return
		}
		userCache.WriteContext(c)

		token, err := model.GetTokenByIds(req.TokenId, c.GetInt("id"))
		if err == nil {
			err = service.ValidatePlaygroundToken(c.GetInt("id"), userCache.Group, req, token)
		}
		if err != nil {
			abortWithOpenAiMessage(c, http.StatusForbidden, err.Error(), types.ErrorCodeAccessDenied)
			return
		}

		if err := SetupContextForToken(c, token); err != nil {
			return
		}

		common.SetContextKey(c, constant.ContextKeyUsingGroup, req.Group)
		common.SetContextKey(c, constant.ContextKeyTokenGroup, token.Group)
		common.SetContextKey(c, constant.ContextKeyPlaygroundBillTokenQuota, true)
		c.Next()
	}
}

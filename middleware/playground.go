package middleware

import (
	"io"
	"net/http"
	"net/url"
	"strings"

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
		req, err := parsePlaygroundRequest(c)
		if err != nil {
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
		if err = service.ValidatePlaygroundEndpoint(req, c.Request.URL.Path); err != nil {
			abortWithOpenAiMessage(c, http.StatusBadRequest, err.Error(), types.ErrorCodeInvalidRequest)
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

func parsePlaygroundRequest(c *gin.Context) (dto.PlayGroundRequest, error) {
	req := dto.PlayGroundRequest{}
	contentType := c.Request.Header.Get("Content-Type")

	if strings.Contains(contentType, gin.MIMEMultipartPOSTForm) {
		form, err := common.ParseMultipartFormReusable(c)
		if err != nil {
			return req, err
		}
		fillPlaygroundRequestFromValues(&req, form.Value)
		return req, nil
	}

	if strings.Contains(contentType, gin.MIMEPOSTForm) {
		storage, err := common.GetBodyStorage(c)
		if err != nil {
			return req, err
		}
		requestBody, err := storage.Bytes()
		if err != nil {
			return req, err
		}
		values, err := url.ParseQuery(string(requestBody))
		if err != nil {
			return req, err
		}
		fillPlaygroundRequestFromValues(&req, values)
		if _, err = storage.Seek(0, io.SeekStart); err != nil {
			return req, err
		}
		c.Request.Body = io.NopCloser(storage)
		return req, nil
	}

	if err := common.UnmarshalBodyReusable(c, &req); err != nil {
		return req, err
	}
	return req, nil
}

func fillPlaygroundRequestFromValues(req *dto.PlayGroundRequest, values map[string][]string) {
	req.Group = firstFormValue(values, "group")
	req.Model = firstFormValue(values, "model")
	req.TokenId = common.String2Int(firstFormValue(values, "token_id"))
}

func firstFormValue(values map[string][]string, key string) string {
	items := values[key]
	if len(items) == 0 {
		return ""
	}
	return items[0]
}

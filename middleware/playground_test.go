package middleware

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func newPlaygroundRequestContext(request *http.Request) *gin.Context {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = request
	return c
}

func TestParsePlaygroundRequestJSON(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/pg/images/generations",
		strings.NewReader(`{"group":"image-group","model":"gpt-image-2","token_id":123}`),
	)
	request.Header.Set("Content-Type", "application/json")

	req, err := parsePlaygroundRequest(newPlaygroundRequestContext(request))
	require.NoError(t, err)
	require.Equal(t, "image-group", req.Group)
	require.Equal(t, "gpt-image-2", req.Model)
	require.Equal(t, 123, req.TokenId)
}

func TestParsePlaygroundRequestURLEncoded(t *testing.T) {
	values := url.Values{}
	values.Set("group", "image-group")
	values.Set("model", "gpt-image-2")
	values.Set("token_id", "456")
	request := httptest.NewRequest(
		http.MethodPost,
		"/pg/images/generations",
		strings.NewReader(values.Encode()),
	)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	req, err := parsePlaygroundRequest(newPlaygroundRequestContext(request))
	require.NoError(t, err)
	require.Equal(t, "image-group", req.Group)
	require.Equal(t, "gpt-image-2", req.Model)
	require.Equal(t, 456, req.TokenId)
}

func TestParsePlaygroundRequestMultipartKeepsBodyReusable(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("group", "image-group"))
	require.NoError(t, writer.WriteField("model", "gpt-image-2"))
	require.NoError(t, writer.WriteField("token_id", "789"))
	require.NoError(t, writer.WriteField("prompt", "make it brighter"))
	fileWriter, err := writer.CreateFormFile("image", "reference.png")
	require.NoError(t, err)
	_, err = fileWriter.Write([]byte("fake image bytes"))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	request := httptest.NewRequest(http.MethodPost, "/pg/images/edits", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	c := newPlaygroundRequestContext(request)

	req, err := parsePlaygroundRequest(c)
	require.NoError(t, err)
	require.Equal(t, "image-group", req.Group)
	require.Equal(t, "gpt-image-2", req.Model)
	require.Equal(t, 789, req.TokenId)

	form, err := common.ParseMultipartFormReusable(c)
	require.NoError(t, err)
	require.Equal(t, "make it brighter", form.Value["prompt"][0])
	require.Len(t, form.File["image"], 1)
	require.Equal(t, "reference.png", form.File["image"][0].Filename)
}

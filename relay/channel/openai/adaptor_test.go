package openai

import (
	"bytes"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"

	"github.com/gin-gonic/gin"
)

func TestConvertImageRequestPreservesRepeatedImageFields(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if err := writer.WriteField("model", "gpt-image-2"); err != nil {
		t.Fatalf("WriteField model returned error: %v", err)
	}
	if err := writer.WriteField("prompt", "make it cinematic"); err != nil {
		t.Fatalf("WriteField prompt returned error: %v", err)
	}
	for _, filename := range []string{"reference-a.png", "reference-b.png"} {
		part, err := writer.CreateFormFile("image", filename)
		if err != nil {
			t.Fatalf("CreateFormFile returned error: %v", err)
		}
		if _, err = part.Write([]byte("fake image bytes")); err != nil {
			t.Fatalf("part.Write returned error: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("writer.Close returned error: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/images/edits", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = req

	adaptor := &Adaptor{}
	got, err := adaptor.ConvertImageRequest(c, &relaycommon.RelayInfo{
		RelayMode: relayconstant.RelayModeImagesEdits,
	}, dto.ImageRequest{
		Model:  "gpt-image-2",
		Prompt: "make it cinematic",
	})
	if err != nil {
		t.Fatalf("ConvertImageRequest returned error: %v", err)
	}

	requestBody, ok := got.(*bytes.Buffer)
	if !ok {
		t.Fatalf("ConvertImageRequest returned %T, want *bytes.Buffer", got)
	}
	_, params, err := mime.ParseMediaType(c.Request.Header.Get("Content-Type"))
	if err != nil {
		t.Fatalf("ParseMediaType returned error: %v", err)
	}
	form, err := multipart.NewReader(bytes.NewReader(requestBody.Bytes()), params["boundary"]).ReadForm(32 << 20)
	if err != nil {
		t.Fatalf("ReadForm returned error: %v", err)
	}
	defer form.RemoveAll()

	if gotModel := form.Value["model"]; len(gotModel) != 1 || gotModel[0] != "gpt-image-2" {
		t.Fatalf("model field = %#v, want gpt-image-2", gotModel)
	}
	if gotImages := form.File["image"]; len(gotImages) != 2 {
		t.Fatalf("image file count = %d, want 2", len(gotImages))
	}
	if gotArrayImages := form.File["image[]"]; len(gotArrayImages) != 0 {
		t.Fatalf("image[] file count = %d, want 0", len(gotArrayImages))
	}
}

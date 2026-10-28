package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSAllowsDesktopOriginAndRejectsUnknownOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.GET("/health", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	allowed := httptest.NewRecorder()
	allowedRequest := httptest.NewRequest(http.MethodGet, "/health", nil)
	allowedRequest.Header.Set("Origin", "http://wails.localhost")
	router.ServeHTTP(allowed, allowedRequest)
	if allowed.Code != http.StatusOK {
		t.Fatalf("allowed status = %d, want 200", allowed.Code)
	}
	if allowed.Header().Get("Access-Control-Allow-Origin") != "http://wails.localhost" {
		t.Fatalf("allowed origin header = %q", allowed.Header().Get("Access-Control-Allow-Origin"))
	}

	blocked := httptest.NewRecorder()
	blockedRequest := httptest.NewRequest(http.MethodGet, "/health", nil)
	blockedRequest.Header.Set("Origin", "https://evil.example")
	router.ServeHTTP(blocked, blockedRequest)
	if blocked.Code != http.StatusForbidden {
		t.Fatalf("blocked status = %d, want 403", blocked.Code)
	}
}

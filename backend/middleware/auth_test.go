package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"Notice/utils/jwt"

	"github.com/gin-gonic/gin"
)

func TestAuthRejectsMissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/protected", Auth(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
}

func TestAuthAcceptsValidToken(t *testing.T) {
	t.Setenv("NOTICE_JWT_SECRET", strings.Repeat("s", 32))
	token, err := jwt.GenerateToken(7)
	if err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/protected", Auth(), func(c *gin.Context) {
		if c.GetUint("userID") != 7 {
			t.Fatalf("userID = %d, want 7", c.GetUint("userID"))
		}
		c.Status(http.StatusOK)
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
}

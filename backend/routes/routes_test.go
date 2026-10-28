package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHealthAndTokenRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router)

	health := httptest.NewRecorder()
	router.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/health", nil))
	if health.Code != http.StatusOK {
		t.Fatalf("health status = %d, want %d", health.Code, http.StatusOK)
	}

	tokenList := httptest.NewRecorder()
	router.ServeHTTP(tokenList, httptest.NewRequest(http.MethodGet, "/api/token/list", nil))
	if tokenList.Code != http.StatusUnauthorized {
		t.Fatalf("token list status = %d, want %d", tokenList.Code, http.StatusUnauthorized)
	}

	createSubscription := httptest.NewRecorder()
	router.ServeHTTP(createSubscription, httptest.NewRequest(http.MethodPost, "/api/users/subscribe/new", nil))
	if createSubscription.Code != http.StatusUnauthorized {
		t.Fatalf("create subscription status = %d, want %d", createSubscription.Code, http.StatusUnauthorized)
	}
}

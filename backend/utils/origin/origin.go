package origin

import (
	"net/url"
	"strings"
)

// Allowed 判断浏览器请求来源是否可信。
// Wails 生产页面使用 http://wails.localhost；开发服务器和本地工具使用 localhost。
// 空 Origin 表示非浏览器客户端（例如 curl/测试），不作为浏览器同源保护对象。
func Allowed(raw string) bool {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return true
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Hostname() == "" {
		return false
	}
	switch strings.ToLower(parsed.Hostname()) {
	case "wails.localhost", "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}

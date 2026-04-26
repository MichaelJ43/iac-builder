package aiassist

import (
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Limiter is a very small fixed-window (per wall-clock minute) per-key counter.
// It is intended to cap abuse of /api/v1/ai/assist. Not suitable as a global
// distributed cap across many Lambdas (each instance has its own map).
type Limiter struct {
	mu    sync.Mutex
	per   map[string]*minuteBucket
	limit int
}

type minuteBucket struct {
	minute int64
	count  int
}

// NewLimiter returns a limiter allowing at most maxPerMinute requests per key
// in each wall-clock minute (UTC, divided by 60s since epoch).
func NewLimiter(maxPerMinute int) *Limiter {
	if maxPerMinute < 1 {
		maxPerMinute = 1
	}
	return &Limiter{
		per:   make(map[string]*minuteBucket),
		limit: maxPerMinute,
	}
}

// NewLimiterFromEnv uses IAC_AI_ASSIST_RPM (default 20), minimum 1.
func NewLimiterFromEnv() *Limiter {
	n := 20
	if s := strings.TrimSpace(os.Getenv("IAC_AI_ASSIST_RPM")); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 {
			n = v
		}
	}
	return NewLimiter(n)
}

// Allow reports whether a request is allowed; it increments the counter for key when true.
func (l *Limiter) Allow(key string) bool {
	now := time.Now().UTC().Unix() / 60
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.per[key]
	if !ok || b.minute != now {
		l.per[key] = &minuteBucket{minute: now, count: 1}
		return true
	}
	if b.count >= l.limit {
		return false
	}
	b.count++
	return true
}

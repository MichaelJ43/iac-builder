package aiassist

import "testing"

func TestLimiter_WithinSameMinute(t *testing.T) {
	l := NewLimiter(3)
	for i := 0; i < 3; i++ {
		if !l.Allow("a") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if l.Allow("a") {
		t.Fatal("4th in same window should be denied")
	}
}

func TestLimiter_DistinctKeys(t *testing.T) {
	l := NewLimiter(1)
	if !l.Allow("a") {
		t.Fatal("a first")
	}
	if !l.Allow("b") {
		t.Fatal("b first")
	}
}

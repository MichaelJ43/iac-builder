package gen

import (
	"strconv"
	"strings"
)

// tsq returns a double-quoted TypeScript/JSON string literal.
func tsq(s string) string { return strconv.Quote(s) }

func tsStringArrayLiteral(ss []string) string {
	if len(ss) == 0 {
		return "[]"
	}
	parts := make([]string, len(ss))
	for i, x := range ss {
		parts[i] = tsq(x)
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

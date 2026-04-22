import { describe, it, expect } from "vitest";
import { isAiAssistUIEnabled } from "@ui/flags";

describe("flags", () => {
  it("isAiAssistUIEnabled reads VITE build flag", () => {
    // Default Vitest: VITE_IAC_AI_ASSIST is not "true" unless the pipeline sets it
    const v = isAiAssistUIEnabled();
    expect(typeof v).toBe("boolean");
  });
});

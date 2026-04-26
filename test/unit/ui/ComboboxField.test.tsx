/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ComboboxField } from "@ui/ComboboxField";

function Harness() {
  const [val, setVal] = useState("");
  return (
    <ComboboxField
      label="Test"
      value={val}
      onChange={setVal}
      suggestions={[{ value: "a" }, { value: "b" }]}
    />
  );
}

describe("ComboboxField", () => {
  it("updates value and keeps custom text", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Test");
    await user.type(input, "custom-id");
    expect((input as HTMLInputElement).value).toBe("custom-id");
  });
});

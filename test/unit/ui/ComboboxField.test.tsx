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
  it("sets aria-busy when busy", () => {
    render(
      <ComboboxField
        label="N"
        value=""
        onChange={() => undefined}
        suggestions={[]}
        busy
        aria-label="N"
      />
    );
    expect(
      (screen.getByLabelText("N") as HTMLInputElement).getAttribute("aria-busy")
    ).toBe("true");
  });

  it("updates value and keeps custom text", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText("Test");
    await user.type(input, "custom-id");
    expect((input as HTMLInputElement).value).toBe("custom-id");
  });
});

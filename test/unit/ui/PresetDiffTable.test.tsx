/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { WizardState } from "@ui/api";
import { PresetDiffTable } from "@ui/PresetDiffTable";

const a = (): WizardState => ({
  framework: "terraform",
  cloud: "aws",
  region: "us-east-1",
  vpc_id: "",
  subnet_id: "subnet-1",
  instance_type: "t3.micro",
  ami: "ami-1",
  key_name: "",
  security_group_ids: [],
  associate_public_ip: false,
  imdsv2_required: false,
  ssh_cidr: "",
  enable_ebs_encryption: false,
});

describe("PresetDiffTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows no-differences message when states match", () => {
    const s = a();
    render(<PresetDiffTable name="Prod" baseline={s} current={{ ...s }} onClear={() => {}} />);
    expect(screen.getByText(/No differences/)).toBeTruthy();
  });

  it("renders table rows and calls onClear", () => {
    const onClear = vi.fn();
    const cur = { ...a(), region: "eu-west-1" };
    render(<PresetDiffTable name="Prod" baseline={a()} current={cur} onClear={onClear} />);
    expect(screen.getByText("Region")).toBeTruthy();
    expect(screen.getByText("us-east-1")).toBeTruthy();
    expect(screen.getByText("eu-west-1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /clear baseline/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

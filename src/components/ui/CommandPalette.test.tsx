import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";

describe("CommandPalette", () => {
  it("renders results and triggers select", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <CommandPalette
        open
        onClose={vi.fn()}
        onSelect={onSelect}
        results={[
          { id: "skill-weather", title: "weather", subtitle: "Skill" },
          { id: "skill-lint", title: "lint", subtitle: "Skill" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /weather/i }));
    expect(onSelect).toHaveBeenCalledWith({ id: "skill-weather", title: "weather", subtitle: "Skill" });
  });

  it("closes with escape", () => {
    const onClose = vi.fn();

    render(
      <CommandPalette
        open
        onClose={onClose}
        onSelect={vi.fn()}
        results={[]}
      />,
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalled();
  });
});

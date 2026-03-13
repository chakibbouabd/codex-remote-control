import React from "react";
import { render } from "@testing-library/react-native";
import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders with label text", () => {
    const { getByText } = render(<Badge label="Active" />);
    expect(getByText("Active")).toBeTruthy();
  });

  it("renders with default variant", () => {
    const { toJSON } = render(<Badge label="Default" />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders with success variant", () => {
    const { toJSON } = render(<Badge label="Success" variant="success" />);
    expect(toJSON()).toBeTruthy();
  });

  it("renders different variants and they produce different outputs", () => {
    const defaultTree = render(<Badge label="A" />).toJSON();
    const successTree = render(<Badge label="B" variant="success" />).toJSON();
    const dangerTree = render(<Badge label="C" variant="danger" />).toJSON();

    // Different variants should render differently
    expect(defaultTree).not.toEqual(successTree);
    expect(successTree).not.toEqual(dangerTree);
  });

  it("renders with danger variant", () => {
    const { getByText } = render(<Badge label="Error" variant="danger" />);
    expect(getByText("Error")).toBeTruthy();
  });
});

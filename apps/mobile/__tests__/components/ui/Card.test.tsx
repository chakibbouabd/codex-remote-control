import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children text content via Text element", () => {
    const { getByText } = render(
      <Card>
        <Text>Hello World</Text>
      </Card>,
    );
    expect(getByText("Hello World")).toBeTruthy();
  });

  it("renders with default variant", () => {
    const { toJSON } = render(
      <Card>
        <Text>Content</Text>
      </Card>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it("renders with bordered variant and output differs from default", () => {
    const defaultTree = render(
      <Card>
        <Text>Test</Text>
      </Card>,
    ).toJSON();
    const borderedTree = render(
      <Card variant="bordered">
        <Text>Test</Text>
      </Card>,
    ).toJSON();
    expect(defaultTree).not.toEqual(borderedTree);
  });
});

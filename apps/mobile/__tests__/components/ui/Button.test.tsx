import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with title text", () => {
    const { toJSON } = render(<Button title="Click me" onPress={() => {}} />);
    expect(JSON.stringify(toJSON())).toContain("Click me");
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(getByText("Submit"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders with disabled state", () => {
    const { toJSON } = render(
      <Button title="Disabled" onPress={() => {}} disabled={true} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it("renders different variants without crashing", () => {
    const { toJSON } = render(
      <>
        <Button title="Primary" onPress={() => {}} variant="primary" />
        <Button title="Danger" onPress={() => {}} variant="danger" />
        <Button title="Ghost" onPress={() => {}} variant="ghost" />
      </>,
    );
    expect(toJSON()).toBeTruthy();
  });
});

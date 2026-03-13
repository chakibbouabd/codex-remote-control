import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ApprovalCard } from "@/components/conversation/ApprovalCard";

describe("ApprovalCard", () => {
  it("renders the command text", () => {
    const { getByText } = render(
      <ApprovalCard
        command="rm -rf node_modules"
        onAccept={() => {}}
        onDecline={() => {}}
      />,
    );
    expect(getByText("rm -rf node_modules")).toBeTruthy();
  });

  it("renders the title (case-insensitive, textTransform not applied in test renderer)", () => {
    const { toJSON } = render(
      <ApprovalCard
        command="echo hello"
        onAccept={() => {}}
        onDecline={() => {}}
      />,
    );
    // textTransform: "uppercase" may not be applied in test renderer
    expect(JSON.stringify(toJSON())).toContain("Approval Required");
  });

  it("renders Accept and Decline buttons", () => {
    const { getByText } = render(
      <ApprovalCard
        command="git push"
        onAccept={() => {}}
        onDecline={() => {}}
      />,
    );
    expect(getByText("Accept")).toBeTruthy();
    expect(getByText("Decline")).toBeTruthy();
  });

  it("calls onAccept when Accept is pressed", () => {
    const onAccept = jest.fn();
    const { getByText } = render(
      <ApprovalCard
        command="npm install"
        onAccept={onAccept}
        onDecline={() => {}}
      />,
    );

    fireEvent.press(getByText("Accept"));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("calls onDecline when Decline is pressed", () => {
    const onDecline = jest.fn();
    const { getByText } = render(
      <ApprovalCard
        command="npm install"
        onAccept={() => {}}
        onDecline={onDecline}
      />,
    );

    fireEvent.press(getByText("Decline"));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});

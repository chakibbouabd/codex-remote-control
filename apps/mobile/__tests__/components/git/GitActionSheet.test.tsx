import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { GitActionSheet } from "@/components/git/GitActionSheet";

describe("GitActionSheet", () => {
  const makeActions = () => [
    { label: "Commit", icon: "📝", onPress: jest.fn() },
    { label: "Push", icon: "⬆️", onPress: jest.fn() },
    { label: "Discard All", icon: "🗑️", destructive: true, onPress: jest.fn() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when visible", () => {
    const { toJSON } = render(
      <GitActionSheet visible={true} onClose={() => {}} actions={makeActions()} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it("does not render when not visible", () => {
    const { toJSON } = render(
      <GitActionSheet visible={false} onClose={() => {}} actions={makeActions()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it("renders all action labels and icons", () => {
    const { getByText } = render(
      <GitActionSheet visible={true} onClose={() => {}} actions={makeActions()} />,
    );
    expect(getByText("Commit")).toBeTruthy();
    expect(getByText("Push")).toBeTruthy();
    expect(getByText("Discard All")).toBeTruthy();
    expect(getByText("📝")).toBeTruthy();
    expect(getByText("⬆️")).toBeTruthy();
  });

  it("renders the title", () => {
    const { getByText } = render(
      <GitActionSheet visible={true} onClose={() => {}} actions={makeActions()} />,
    );
    expect(getByText("Git Actions")).toBeTruthy();
  });

  it("renders Cancel button", () => {
    const { getByText } = render(
      <GitActionSheet visible={true} onClose={() => {}} actions={makeActions()} />,
    );
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("calls action onPress and onClose when action is tapped", () => {
    const onClose = jest.fn();
    const actions = makeActions();
    const { getByText } = render(
      <GitActionSheet visible={true} onClose={onClose} actions={actions} />,
    );

    fireEvent.press(getByText("Commit"));
    expect(actions[0].onPress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel is tapped", () => {
    const onClose = jest.fn();
    const actions = makeActions();
    const { getByText } = render(
      <GitActionSheet visible={true} onClose={onClose} actions={actions} />,
    );

    fireEvent.press(getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(actions[0].onPress).not.toHaveBeenCalled();
  });
});

import React from "react";
import { render } from "@testing-library/react-native";
import { StreamingText } from "@/components/conversation/StreamingText";

describe("StreamingText", () => {
  it("renders the text content", () => {
    const { toJSON } = render(<StreamingText text="Hello world" />);
    const tree = toJSON() as any;
    expect(tree.children.join("")).toContain("Hello world");
  });

  it("shows cursor when not complete", () => {
    const { toJSON } = render(
      <StreamingText text="Typing..." isComplete={false} />,
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("▊");
  });

  it("hides cursor when complete", () => {
    const { toJSON } = render(
      <StreamingText text="Done." isComplete={true} />,
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain("▊");
  });

  it("shows cursor by default (isComplete defaults to false)", () => {
    const { toJSON } = render(<StreamingText text="Streaming..." />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("▊");
  });

  it("renders empty text without crashing", () => {
    const { toJSON } = render(<StreamingText text="" />);
    expect(toJSON()).toBeTruthy();
  });

  it("differs between complete and incomplete states", () => {
    const completeTree = render(
      <StreamingText text="Test" isComplete={true} />,
    ).toJSON();
    const incompleteTree = render(
      <StreamingText text="Test" isComplete={false} />,
    ).toJSON();
    expect(completeTree).not.toEqual(incompleteTree);
  });
});

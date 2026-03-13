import React from "react";
import { render } from "@testing-library/react-native";
import { GitStatusCard } from "@/components/git/GitStatusCard";

describe("GitStatusCard", () => {
  const baseStatus = {
    branch: "main",
    dirty: false,
    staged: 0,
    modified: 0,
    untracked: 0,
  };

  it("renders the branch name", () => {
    const { getByText } = render(<GitStatusCard status={baseStatus} />);
    expect(getByText("main")).toBeTruthy();
  });

  it("renders the Branch label", () => {
    const { getByText } = render(<GitStatusCard status={baseStatus} />);
    expect(getByText("Branch")).toBeTruthy();
  });

  it("shows staged count when dirty", () => {
    const { getByText } = render(
      <GitStatusCard status={{ ...baseStatus, dirty: true, staged: 3 }} />,
    );
    expect(getByText("+3")).toBeTruthy();
    expect(getByText("staged")).toBeTruthy();
  });

  it("shows modified count when dirty", () => {
    const { getByText } = render(
      <GitStatusCard status={{ ...baseStatus, dirty: true, modified: 5 }} />,
    );
    expect(getByText("~5")).toBeTruthy();
    expect(getByText("modified")).toBeTruthy();
  });

  it("shows untracked count when dirty", () => {
    const { getByText } = render(
      <GitStatusCard status={{ ...baseStatus, dirty: true, untracked: 2 }} />,
    );
    expect(getByText("?2")).toBeTruthy();
    expect(getByText("untracked")).toBeTruthy();
  });

  it("hides file counts when not dirty", () => {
    const { queryByText } = render(
      <GitStatusCard
        status={{ ...baseStatus, dirty: true, staged: 0, modified: 0, untracked: 0 }}
      />,
    );
    expect(queryByText("staged")).toBeNull();
    expect(queryByText("modified")).toBeNull();
    expect(queryByText("untracked")).toBeNull();
  });

  it("shows all file types when all have counts", () => {
    const { getByText } = render(
      <GitStatusCard
        status={{ ...baseStatus, dirty: true, staged: 1, modified: 2, untracked: 1 }}
      />,
    );
    expect(getByText("+1")).toBeTruthy();
    expect(getByText("~2")).toBeTruthy();
    expect(getByText("?1")).toBeTruthy();
  });
});

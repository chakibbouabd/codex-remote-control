import { Redirect } from "expo-router";
import { useSessionStore } from "@/stores/session";

export default function IndexScreen() {
  const isPaired = useSessionStore((state) => state.isPaired);

  return <Redirect href={isPaired ? "/(main)" : "/(auth)/connect"} />;
}

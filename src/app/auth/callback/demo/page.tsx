import AuthCallbackDemo from "@/screens/AuthCallbackDemo";

export default function Page() {
  const sourceOwner = process.env.GITHUB_REPO_OWNER ?? "";
  const sourceRepo = process.env.GITHUB_REPO_NAME ?? "";
  return <AuthCallbackDemo sourceOwner={sourceOwner} sourceRepo={sourceRepo} />;
}

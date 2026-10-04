import { redirectIfSignedIn } from "@/lib/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfSignedIn();
  return children;
}

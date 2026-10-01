import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = { title: "Sign in · Tasklist 2" };

export default function SignInPage() {
  return <AuthScreen mode="sign-in" />;
}

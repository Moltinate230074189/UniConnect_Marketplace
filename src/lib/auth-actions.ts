import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";

export async function socialSignIn(provider: "google" | "apple" | "facebook" | "instagram") {
  if (provider === "facebook" || provider === "instagram") {
    toast.info(`${provider === "facebook" ? "Facebook" : "Instagram"} sign-in is coming soon. Use Google, Apple or email for now.`);
    return;
  }
  const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
  if (result.error) toast.error(result.error.message ?? "Sign-in failed");
}

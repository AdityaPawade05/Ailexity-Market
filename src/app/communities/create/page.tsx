import { redirect } from "next/navigation";

// The create-community flow now lives in the unified "Create New" page at
// /channel/new (Community tab). Keep this URL working by redirecting there.
export default function CreateCommunityRedirect() {
  redirect("/channel/new?type=community");
}

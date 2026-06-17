import { redirect } from "next/navigation";

export default function ApplicantSearchRedirect() {
  redirect("/admin/new-application");
}

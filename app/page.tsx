import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function IndexPage() {
  redirect((await getSession()) ? "/home" : "/login");
}

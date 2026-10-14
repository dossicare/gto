import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Every page under /admin (except the login page) is checked here, on the server, on every request. */
export default async function ConsoleLayout({ children }: LayoutProps<"/admin">) {
  const { email } = await requireAdmin();
  return (
    <>
      <AdminHeader email={email} />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-8">{children}</main>
    </>
  );
}

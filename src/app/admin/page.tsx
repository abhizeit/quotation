import { AdminApp } from "@/components/admin/AdminApp";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/auth";
import { loadAdminData } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const admin = await getAdmin();
  if (!admin) return <LoginForm />;
  let data = null;
  try {
    data = await loadAdminData(admin.id);
  } catch {
    data = null;
  }
  if (!data) {
    return (
      <div className="setup">
        <h1>Database is not ready</h1>
        <p>Start Postgres, migrate, and seed before signing in.</p>
      </div>
    );
  }
  return <AdminApp data={data} initialTab={params.tab || "quotes"} />;
}

import { QuotationApp } from "@/components/quotation/QuotationApp";
import { loadPublicConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let config = null;
  try {
    config = await loadPublicConfig();
  } catch {
    config = null;
  }
  if (!config) return <SetupNotice />;
  return <QuotationApp config={config} />;
}

function SetupNotice() {
  return (
    <div className="setup">
      <h1>Database is not ready</h1>
      <p>Start Postgres, then apply the schema and seed the quotation settings.</p>
      <ol>
        <li>
          <code>docker compose up -d</code>
        </li>
        <li>
          <code>npx prisma migrate dev --name init</code>
        </li>
        <li>
          <code>npx prisma db seed</code>
        </li>
      </ol>
    </div>
  );
}

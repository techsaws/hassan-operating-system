"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="panel p-8">
      <h1 className="text-xl">Workspace unavailable</h1>
      <p className="my-4 max-w-lg text-sm text-zinc-600">
        Check that PostgreSQL is running, DATABASE_URL is set in .env.local, and
        migrations have been applied with npm run db:migrate.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

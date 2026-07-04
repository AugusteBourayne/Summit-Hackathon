import team from "@/seed/team.json";

export default function TeamSettings() {
  const { company } = team as {
    company: { name: string; description: string; product: string };
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Team settings</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This context is shared by every clone — it&apos;s what makes their answers relevant to
        the business, not just to their personal style.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Company name</label>
          <p className="mt-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            {company.name}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <p className="mt-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            {company.description}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Product</label>
          <p className="mt-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            {company.product}
          </p>
        </div>
      </div>
    </main>
  );
}

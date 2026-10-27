"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ArrowUpRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
export function Dashboard({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[224px_1fr]">
      <aside className="border-b border-zinc-200 bg-white p-5 md:border-r md:min-h-screen">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-semibold tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-teal-800 text-base text-white">
            H
          </span>
          HassanOS
        </Link>
        <p className="mt-3 text-xs text-zinc-500">
          Your client acquisition workspace
        </p>
        <nav
          aria-label="Main navigation"
          className="mt-7 flex gap-2 md:flex-col"
        >
          {[
            { href: "/", title: "Overview", icon: LayoutDashboard },
            { href: "/leads", title: "Leads", icon: Users },
            { href: "/opportunities", title: "Opportunities", icon: Search },
          ].map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "page"
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "bg-teal-50 font-medium text-teal-900"
                  : "text-zinc-600 hover:bg-zinc-100",
              )}
            >
              <Icon size={17} />
              {title}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex items-center gap-2 text-xs text-zinc-500">
          <ArrowUpRight size={14} />
          Local acquisition workspace
        </div>
      </aside>
      <main className="min-w-0 p-5 md:p-10 lg:p-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { MarketIcon, PortfolioIcon, HistoryIcon, AccountIcon } from "@/components/icons";

const NAV = [
  { href: "/", label: "Market", Icon: MarketIcon },
  { href: "/portfolio", label: "Portfolio", Icon: PortfolioIcon },
  { href: "/history", label: "History", Icon: HistoryIcon },
  { href: "/account", label: "Account", Icon: AccountIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/instrument");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Rail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: compact left rail. Group is for hover-expand affordance. */}
      <nav
        aria-label="Primary"
        className="group fixed inset-y-0 left-0 z-20 hidden w-16 flex-col border-r border-line bg-ink-800 md:flex"
      >
        <div className="flex h-14 items-center justify-center border-b border-line">
          <Wordmark compact />
        </div>
        <ul className="flex flex-1 flex-col gap-1 p-2">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-md px-3 text-text-lo transition-colors hover:bg-ink-700 hover:text-text-hi ${
                    active ? "bg-ink-700 text-text-hi" : ""
                  }`}
                >
                  <span className={active ? "text-signal" : ""}>
                    <Icon />
                  </span>
                  <span className="hidden whitespace-nowrap text-sm">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: fixed bottom bar. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-ink-800 md:hidden"
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${
                active ? "text-signal" : "text-text-lo"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

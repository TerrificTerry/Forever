"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation, type NavigationEntry, type NavigationGroup } from "@/lib/modules";
import { logoutAction } from "@/app/actions/auth";

function isNavigationGroup(entry: NavigationEntry): entry is NavigationGroup {
  return !Array.isArray(entry);
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/home" && pathname.startsWith(`${href}/`));
}

function linkClass(active: boolean, child = false) {
  return `block rounded-lg px-3 py-2.5 text-[14px] transition ${child ? "ml-3" : ""} ${active ? "bg-moss text-white" : "text-stone-600 hover:bg-stone-100 hover:text-ink"}`;
}

function NavLinks({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Main navigation">
      {navigation.map((entry) => {
        if (!isNavigationGroup(entry)) {
          const [href, label] = entry;
          return <Link key={href} href={href} onClick={close} className={linkClass(isActive(pathname, href))}>{label}</Link>;
        }
        const groupActive = (entry.href ? isActive(pathname, entry.href) : false) || entry.items.some(([href]) => isActive(pathname, href));
        return (
          <div key={entry.label} className="py-1">
            {entry.href ? (
              <Link href={entry.href} onClick={close} className={linkClass(groupActive)}>{entry.label}</Link>
            ) : (
              <div className={`px-3 py-2 text-[11px] font-bold uppercase tracking-[.18em] ${groupActive ? "text-moss" : "text-stone-400"}`}>{entry.label}</div>
            )}
            <div className="mt-1 space-y-1">
              {entry.items.map(([href, label]) => <Link key={href} href={href} onClick={close} className={linkClass(isActive(pathname, href), true)}>{label}</Link>)}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-paper/95 px-5 backdrop-blur md:hidden">
        <Link href="/home" className="font-serif text-xl tracking-tight">Spirit Archive</Link>
        <button type="button" className="rounded-full border border-line bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider" onClick={() => setOpen(true)}>Menu</button>
      </header>
      {open && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-line bg-[#f9f7f2] px-5 py-6 transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-start justify-between px-2">
          <Link href="/home" onClick={() => setOpen(false)}>
            <div className="font-serif text-[22px] tracking-tight">Spirit Archive</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-stone-500">Private intelligence</div>
          </Link>
          <button type="button" className="text-sm text-stone-500 md:hidden" onClick={() => setOpen(false)}>Close</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto"><NavLinks close={() => setOpen(false)} /></div>
        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-3 px-3 text-[11px] leading-5 text-stone-500">Private by design.<br />Your archive stays yours.</div>
          <form action={logoutAction}><button className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-stone-600 hover:bg-stone-100">Log out</button></form>
        </div>
      </aside>
    </>
  );
}

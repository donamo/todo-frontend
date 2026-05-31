import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, List, LogOut } from "lucide-react";
import { App } from "./app";
import { useAuth } from "./components/auth-guard";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import { HomePage } from "./pages/home-page";

type PageKey = "home" | "workspace";

const pageLabel: Record<PageKey, string> = {
  home: "Kezdőlap",
  workspace: "Komplex nézet",
};

const pageIcon: Record<PageKey, typeof List> = {
  home: List,
  workspace: LayoutDashboard,
};

const pages: PageKey[] = ["home", "workspace"];

function NavMenu({
  current,
  onChange,
}: {
  current: PageKey;
  onChange: (page: PageKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const CurrentIcon = pageIcon[current];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        <CurrentIcon className="h-4 w-4 text-muted-foreground" />
        {pageLabel[current]}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-popover shadow-md">
          {pages.map((page) => {
            const Icon = pageIcon[page];
            return (
              <button
                key={page}
                type="button"
                onClick={() => {
                  onChange(page);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md",
                  page === current && "bg-accent font-medium",
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {pageLabel[page]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Shell() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState<PageKey>("home");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-semibold leading-none">Todo Workspace</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Epic → Project → Stage → Todo</p>
            </div>
            <NavMenu current={page} onChange={setPage} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              title="Kijelentkezés"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Kijelentkezés</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-auto">
        {page === "home" && <HomePage />}
        {page === "workspace" && <App />}
      </main>
    </div>
  );
}

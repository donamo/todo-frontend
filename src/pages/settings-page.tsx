import { useMutation, useQuery } from "@apollo/client";
import { CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../components/auth-guard";
import { UPDATE_USER_MUTATION, USERS_QUERY } from "../graphql/todo";
import type { AppUser } from "../types";

type UsersData = { users: AppUser[] };

function UserRow({ user, currentUserId }: { user: AppUser; currentUserId: string }) {
  const [updateUser, { loading }] = useMutation(UPDATE_USER_MUTATION, {
    refetchQueries: [{ query: USERS_QUERY }],
  });

  const toggle = () => {
    void updateUser({ variables: { id: user.id, input: { approved: !user.approved } } });
  };

  const isMe = user.id === currentUserId;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium leading-snug">{user.name}</span>
          {user.isAdmin && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </span>
          )}
          {isMe && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              Te
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={
            user.approved
              ? "text-xs font-medium text-emerald-600"
              : "text-xs font-medium text-muted-foreground"
          }
        >
          {user.approved ? "Engedélyezett" : "Függőben"}
        </span>

        <button
          type="button"
          onClick={toggle}
          disabled={loading || isMe}
          title={isMe ? "Saját fiókot nem módosíthatod" : user.approved ? "Letiltás" : "Engedélyezés"}
          className="shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : user.approved ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 transition-opacity hover:opacity-70" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/50 transition-opacity hover:opacity-70" />
          )}
        </button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<UsersData>(USERS_QUERY);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Rendszerbeállítások</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Felhasználói hozzáférések kezelése
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/50 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Felhasználók
          </h3>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <p className="py-4 text-sm text-destructive">
              Nem sikerült betölteni a felhasználókat.
            </p>
          )}

          {data && (
            <div className="space-y-2">
              {data.users.map((u) => (
                <UserRow key={u.id} user={u} currentUserId={user.id} />
              ))}
              {data.users.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nincsenek felhasználók.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

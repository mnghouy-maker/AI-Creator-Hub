/**
 * Authenticated app shell: fixed sidebar + sticky topbar + scrollable content.
 * The command palette is mounted once here so ⌘K works on every app page.
 *
 * Note: route protection is enforced by the API (every data call requires the
 * session cookie). A Next middleware redirect can be layered on in Phase 9 for a
 * nicer UX, but security does not depend on the client.
 */
import { Sidebar } from '@/components/app/sidebar';
import { Topbar } from '@/components/app/topbar';
import { CommandPalette } from '@/components/app/command-palette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}

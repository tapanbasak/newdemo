import type { ReactNode } from "react";
import { AppSidebar } from "../components/app-sidebar";
import { BrowseProvider } from "../components/browse-context";
import "../v2.css";

export const metadata = {
  title: "Prompt Hub",
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="v2-root">
      <BrowseProvider>
        <div className="v2-shell">
          <AppSidebar />
          <main className="v2-main">{children}</main>
        </div>
      </BrowseProvider>
    </div>
  );
}

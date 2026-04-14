import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import type { Metadata } from "next";
import ChatboxWidget from "./components/chatbox-widget";

export const metadata: Metadata = {
  title: "Prompt Catch Up",
  description: "Next.js migration of Prompt Catch Up with server APIs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* <ChatboxWidget /> */}
      </body>
    </html>
  );
}

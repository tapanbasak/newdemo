import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import type { Metadata } from "next";
import ChatboxWidget from "./components/chatbox-widget";
import ChatboxWidgetV2 from "./components/chatbox-widget-v2";

export const metadata: Metadata = {
  title: "Prompt Catch Up",
  description: "Next.js migration of Prompt Catch Up with server APIs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const chatWidgetVersion: "v1" | "v2" = "v2";
  return (
    <html lang="en">
      <body>
        {children}
        {chatWidgetVersion === "v2" ? <ChatboxWidgetV2 /> : <ChatboxWidget />}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "@pollar/react/styles.css";
import "./globals.css";
import "./infrastructure.css";
import "./account.css";

export const metadata: Metadata = { title: "Rivo — Money moves closer", description: "Send and receive across borders." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.ordynlife.com"),
  applicationName: "Ordyn Life",
  title: {
    default: "Ordyn Life",
    template: "%s | Ordyn Life",
  },
  description:
    "A private productivity workspace for tasks, training, running, journaling, and calendar planning.",
  openGraph: {
    title: "Ordyn Life",
    description:
      "A private productivity workspace for tasks, training, running, journaling, and calendar planning.",
    siteName: "Ordyn Life",
    type: "website",
    url: "https://app.ordynlife.com",
  },
  robots: {
    index: true,
    follow: true,
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var theme=localStorage.getItem('ordyn-theme')==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(error){document.documentElement.dataset.theme='light';}",
          }}
        />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}

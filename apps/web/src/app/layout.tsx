import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ordyn Life",
  description: "A focused workspace for better daily systems.",
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

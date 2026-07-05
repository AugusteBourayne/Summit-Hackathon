import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import { CurrentUserProvider } from "@/lib/currentUser";
import { ProfileOverridesProvider } from "@/lib/profileOverrides";
import { WorkspaceProvider } from "@/lib/workspace";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Face to Face",
  description: "Rehearse the conversation before it happens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <WorkspaceProvider>
          <CurrentUserProvider>
            <ProfileOverridesProvider>
              <TopNav />
              {children}
            </ProfileOverridesProvider>
          </CurrentUserProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}

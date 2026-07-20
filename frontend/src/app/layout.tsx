import type { Metadata } from "next";
import { Poppins, Roboto } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EcoMatch — Industrial Symbiosis Marketplace",
  description: "AI-driven local SME industrial material matching platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${roboto.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[#F9FAFB] text-[#111827] antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

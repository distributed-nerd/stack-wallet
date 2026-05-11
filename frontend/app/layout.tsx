import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacks Wallet | Premium Farming Dashboard",
  description: "Advanced Stacks wallet with batch simulation and SIP-010 token management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen relative overflow-hidden">
          {/* Animated Background Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary opacity-20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-purple opacity-20 blur-[120px] rounded-full animate-pulse blur-delay"></div>
          
          <main className="relative z-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

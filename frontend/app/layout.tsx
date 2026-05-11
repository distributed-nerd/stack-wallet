import type { Metadata } from "next";
import { StacksAuthProvider } from "@/context/StacksAuthContext";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "StackWallet | Premium Farming Dashboard",
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
        <StacksAuthProvider>
          <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Animated Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary opacity-20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-purple opacity-20 blur-[120px] rounded-full animate-pulse blur-delay"></div>
            
            <Sidebar />
            
            <div className="lg:pl-64 min-h-screen flex flex-col relative z-10">
              <Header />
              <main className="flex-1 p-8">
                {children}
              </main>
            </div>
          </div>
        </StacksAuthProvider>
      </body>
    </html>
  );
}

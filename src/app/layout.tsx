import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { Toaster } from "@/components/ui/sonner";
import "@uploadthing/react/styles.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toolbox Control",
  description: "Система контроля посещаемости сотрудников",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#EE1C23",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Some browser extensions inject attributes like bis_skin_checked, causing hydration mismatch. */}
        <Script id="strip-extension-attrs" strategy="beforeInteractive">
          {`
            (function () {
              var ATTR = 'bis_skin_checked';
              function clean(root) {
                try {
                  var scope = root || document;
                  var nodes = scope.querySelectorAll && scope.querySelectorAll('[' + ATTR + ']');
                  if (!nodes) return;
                  for (var i = 0; i < nodes.length; i++) nodes[i].removeAttribute(ATTR);
                } catch (e) {}
              }
              clean(document);
              try {
                var obs = new MutationObserver(function (mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && m.attributeName === ATTR && m.target && m.target.removeAttribute) {
                      m.target.removeAttribute(ATTR);
                    }
                    if (m.addedNodes && m.addedNodes.length) {
                      for (var j = 0; j < m.addedNodes.length; j++) {
                        var n = m.addedNodes[j];
                        if (n && n.nodeType === 1) {
                          if (n.hasAttribute && n.hasAttribute(ATTR)) n.removeAttribute(ATTR);
                          clean(n);
                        }
                      }
                    }
                  }
                });
                obs.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: [ATTR],
                });
              } catch (e) {}
            })();
          `}
        </Script>
        <Providers>
          <NextSSRPlugin
            /**
             * The `extractRouterConfig` will extract all the route configurations
             * from the router to prevent additional information from being
             * leaked to the client. The data passed to the client is the same
             * as if you were to fetch `/api/uploadthing` directly.
             */
            routerConfig={extractRouterConfig(ourFileRouter)}
          />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

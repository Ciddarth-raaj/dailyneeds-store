import Document, { Head, Html, Main, NextScript } from "next/document";

/**
 * The page shell every route shares. It adds what a phone needs to install
 * the admin app and open it full-screen from the home screen: the web app
 * manifest (public/manifest.json), the theme colour and the icons.
 */
export default class AppDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#6B46C1" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="Daily Needs" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

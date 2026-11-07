# Every Chef for iPhone

A native shell (Capacitor 8) around everychef.app. The app loads the live site, so web updates show up in the app without a new App Store release. Native code here only covers what a website can't do.

## Run it on your iPhone (on the Mac)

1. Install Xcode from the Mac App Store and open it once.
2. In Terminal: `cd dishwise/native && npm install && npx cap sync ios && npx cap open ios`
3. In Xcode: click **App** in the left column, then **Signing & Capabilities**, and pick your team (your Apple ID works for testing; the App Store needs the paid developer account).
4. Plug in your iPhone, choose it at the top of the window, and press ▶.

Nothing else to install: plugins come in through Swift Package Manager.

## What's here

- `capacitor.config.json`: app id `app.everychef.ios`, loads https://everychef.app, navy status bar and splash.
- `www/index.html`: the screen shown if the app can't reach the site.
- `ios/`: the Xcode project. App icon and splash are in `ios/App/App/Assets.xcassets`.

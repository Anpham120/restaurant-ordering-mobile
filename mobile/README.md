# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Promotion popup behavior and checks

The welcome popup appears on app start and after successful login/registration.
X closes that welcome popup without muting a campaign. “Không hiển thị lại trong
phiên này” mutes only that campaign until logout, expiration, another successful
login/registration, or a fresh app run. Home-screen remounts and profile/token
refreshes retain the choices. The home banner remains available.

Viewing a category, dish, or voucher never removes a home banner or its pagination.
Running voucher campaigns stay visible for information after the customer's own
usage limit is reached; checkout still refuses another use of that voucher.

Muted IDs stay in `SessionProvider` memory. The old device-wide
`atlas.promo.hidden.v1` preference is ignored and removed on startup.

Run from `mobile/`:

```bash
npm test -- --runInBand
npm run lint
npx tsc --noEmit
npx expo export --platform web
```

Before merging, also check on Android/iOS: mute a campaign, change tabs, log out
and back in, then register a different customer on the same device. The popup
must become eligible again at each new login/registration when live campaigns exist.

## Build APK (Android)

The APK is built in the cloud with EAS Build and talks to the production API
(`EXPO_PUBLIC_API_URL` in `eas.json`, profile `preview`). Deploy the backend to
`https://order.atlasplatform12.tech` first, otherwise the app cannot reach the API.
iPhone users use the web version at the same address.

```bash
npx eas-cli@latest login                                   # free Expo account
npx eas-cli@latest build -p android --profile preview      # prints a download link for the .apk
```

The first build asks to create the EAS project and an Android keystore; let EAS
generate and keep the keystore (losing it means installed apps cannot be updated).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

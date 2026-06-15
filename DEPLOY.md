# Deploying PickleCounter to the Apple App Store

Everything in the project is build ready: icon, splash, theme, bundle id
(`com.necabunilas.picklecounter`), version `1.0.0` build `1`, and `eas.json`.
What is left needs your accounts and the App Store Connect listing.

## Step 1 — Accounts (only you can do these)
1. **Apple Developer Program**, 99 USD per year: https://developer.apple.com/programs/
   Enroll as an Individual. You need your Apple ID, two factor auth, and a card.
   Approval is usually minutes, sometimes up to about two days.
2. **Expo account** (free), for the cloud builds: https://expo.dev

## Step 2 — Host the privacy policy (required URL)
Apple requires a Privacy Policy URL. Easiest free option using your GitHub:
1. Create a public repo, for example `picklecounter-legal`.
2. Add `PRIVACY.md` (in this folder) to it.
3. Repo Settings -> Pages -> Build from branch `main`, root.
4. Your URL becomes `https://necabunilas.github.io/picklecounter-legal/`.
Use that for both the Privacy Policy URL and the Support URL.

## Step 3 — Build the iOS app (in this folder)
```
npx eas-cli login
npx eas-cli build:configure        # links the project, writes a projectId
npx eas-cli build --platform ios --profile production
```
On the first build, EAS asks to manage your Apple signing for you. Log in with
your Apple account when prompted and let it create the certificate and profile.
The build runs in the cloud and gives you an .ipa when done.

## Step 4 — Submit the build to App Store Connect
```
npx eas-cli submit --platform ios --profile production
```
This uploads the build. It can also create the app record on first run.

## Step 5 — Fill the listing and submit for review
In https://appstoreconnect.apple.com:
1. Confirm the app name (must be unique on the store).
2. Paste the text from `STORE_LISTING.md` (subtitle, description, keywords).
3. Set category Sports, age rating 4+, price Free.
4. Add the Privacy Policy URL and Support URL from Step 2.
5. Answer App Privacy as "Data not collected".
6. Upload screenshots (6.7 inch, 1290 x 2796). Take them on your phone.
7. Select the build from Step 4, then Submit for Review.

Apple review usually takes one to three days. After approval you tap Release.

## Updating later
Bump the version in `app.json` (or let `autoIncrement` handle the build number),
then repeat Step 3 and Step 4.
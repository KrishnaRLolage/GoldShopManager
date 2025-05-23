# Jewellery Shop React Native App (Expo, TypeScript) — Copilot Agent Mode Instructions

This project is a React Native (Expo, TypeScript) app for a jewellery shop, featuring a beautiful Material UI, authentication screens, and business management features. Use these steps to re-generate the project using Copilot Agent Mode on a different machine.

---

## 1. Project Initialization
- Create a new Expo project with TypeScript template.
- Install dependencies:
  - `react-native-paper` (Material UI components)
  - `@react-navigation/native` and related navigation packages

## 2. Project Structure
- Organize the project as follows:
  - `App.tsx`: Main app entry, navigation setup
  - `assets/`: Store images and custom icon components
    - `svg_shop_icon.jpg`: Shop icon image
    - `PJDiamondIcon.tsx`: Custom icon component
  - `screens/`: All main screens
    - `LoginScreen.tsx`, `SignupScreen.tsx`, `DashboardScreen.tsx`, `InvoiceScreen.tsx`, `InventoryScreen.tsx`, `BillingHistoryScreen.tsx`, `CustomersScreen.tsx`

## 3. Navigation Setup
- Use React Navigation to set up stack navigation for all screens.
- Hide navigation headers globally for a clean look.

## 4. Material UI Integration
- Use `react-native-paper` components for all UI elements (Text, Button, TextInput, etc.)
- Ensure consistent styling and spacing across screens.

## 5. PJDiamondIcon Component
- Create `PJDiamondIcon.tsx` in the `assets/` folder.
- Load the icon from the local asset `svg_shop_icon.jpg` using `require`.
- Add a `size` prop for flexible sizing.
- Use the icon prominently on the login screen (e.g., `size={120}`).

## 6. Login Screen
- Place the PJDiamondIcon at the top, visually prominent.
- Add username and password fields using Material UI TextInput.
- Add a login button (navigates to Dashboard for now).
- Add a signup link/button.

## 7. Other Screens
- Create placeholder screens for Signup, Dashboard, Invoice, Inventory, Billing History, and Customers.
- Use Material UI components for all UI.

## 8. Asset Loading
- Ensure all images are loaded using `require` and are placed in the `assets/` folder.
- For SVGs, either use a compatible transformer or convert to PNG/JPG for Expo compatibility.

## 9. UI/UX
- Use flexbox and padding for centering and spacing.
- Keep the UI clean, modern, and visually appealing.

---

## Notes
- Authentication logic is not implemented; login/signup are UI only.
- The PJDiamondIcon is loaded from a local image asset and is scalable.
- All navigation headers are hidden for a minimal look.
- You can further refine UI/UX or add business logic as needed.

---

## Regeneration
To re-create this project with Copilot Agent Mode:
1. Paste these instructions into `Instructions.md`.
2. Start Copilot Agent Mode and follow the steps above.
3. If you encounter asset or dependency issues, refer to Expo and React Native documentation for troubleshooting.

---

This file documents all major steps and design decisions for easy project regeneration and onboarding.
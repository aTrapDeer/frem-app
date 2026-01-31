# FREM iOS App - Development Roadmap

## Project Overview
Native iOS app for FREM ("Forward your finances"), built with SwiftUI, targeting iOS 17+.
This app mirrors the Next.js web app functionality, connecting to the same Turso backend API.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| UI Framework | SwiftUI |
| Minimum iOS | 17.0 |
| Architecture | MVVM |
| Networking | URLSession + async/await |
| Auth | Google Sign-In SDK + NextAuth session tokens |
| State Management | @Observable / @Environment |
| Local Storage | UserDefaults (settings), Keychain (tokens) |
| Charts | Swift Charts framework |

---

## Phase 1: Foundation

- [x] Project structure and Xcode config
- [x] Swift data models matching database schema
- [x] API service layer (all endpoints)
- [x] Authentication service (Google OAuth)
- [x] Keychain helper for token storage
- [x] Shared UI components (FREMCard, FREMButton, etc.)
- [x] Navigation shell (TabView)
- [x] App entry point and theme/colors

## Phase 2: Core Screens

- [x] **Dashboard** - KPI cards, goal projections, quick actions
- [x] **Daily Interface** - Transaction entry, daily summary, progress bar
- [x] **Goals** - Goal list, create/edit forms, projection cards
- [x] **Budget/Recurring** - Income sources, recurring expenses, one-time transactions
- [x] **Summary** - Financial overview, milestone tracking
- [x] **AI Chat** - Conversational AI interface

## Phase 3: Polish & Native Features (TODO)

- [ ] Push notifications for bill reminders
- [ ] Widgets (daily target, goal progress)
- [ ] Face ID / Touch ID authentication
- [ ] Haptic feedback on transactions
- [ ] Spotlight search integration
- [ ] Siri Shortcuts ("Log expense $20 for lunch")
- [ ] Apple Watch complication (daily target)
- [ ] Dark mode support
- [ ] Offline mode with local SQLite cache
- [ ] Pull-to-refresh on all data views

## Phase 4: App Store (TODO)

- [ ] App icon and launch screen
- [ ] App Store screenshots
- [ ] Privacy policy page
- [ ] App Store listing metadata
- [ ] TestFlight beta distribution
- [ ] App Store submission

---

## Screen Mapping (Web → iOS)

| Web Route | iOS Screen | Tab |
|-----------|-----------|-----|
| `/dashboard` | DashboardView | Dashboard |
| `/daily` | DailyView | Daily |
| `/goals` | GoalsView | Goals |
| `/recurring` | BudgetView | Budget |
| `/summary` | SummaryView | Summary |
| `/chat` | AIChatView | (Sheet) |
| `/roadmap` | RoadmapView | (Inside Summary) |

---

## API Endpoints Used

All API calls go to the existing Next.js backend:

| Endpoint | Method | iOS Usage |
|----------|--------|-----------|
| `/api/auth/[...nextauth]` | POST | Sign in/out |
| `/api/dashboard` | GET | Dashboard KPIs |
| `/api/projections` | GET | Goal projections |
| `/api/projections/monthly` | GET | Monthly breakdown |
| `/api/daily-target` | GET | Daily target calc |
| `/api/transactions` | GET/POST | Daily transactions |
| `/api/goals` | GET/POST/PUT | Goal CRUD |
| `/api/recurring` | GET/POST/PUT | Recurring expenses |
| `/api/income-sources` | GET/POST/PUT | Income sources |
| `/api/side-projects` | GET | Side projects |
| `/api/accounts` | GET | Financial accounts |
| `/api/milestones` | GET | Milestones |
| `/api/one-time-income` | GET | One-time income |
| `/api/summary` | GET | Full summary |
| `/api/ai-report` | GET/POST | AI analysis |
| `/api/ai-chat` | POST | AI chat |
| `/api/user/settings` | GET/PUT | User prefs |

---

## File Structure

```
ios-app/
├── FREMApp.xcodeproj/
│   └── project.pbxproj
├── FREM/
│   ├── FREMApp.swift                 # App entry point
│   ├── ContentView.swift             # Root TabView navigation
│   ├── Info.plist
│   ├── Assets.xcassets/
│   │
│   ├── Models/                       # Data models
│   │   ├── User.swift
│   │   ├── Transaction.swift
│   │   ├── Goal.swift
│   │   ├── RecurringExpense.swift
│   │   ├── IncomeSource.swift
│   │   ├── SideProject.swift
│   │   ├── Milestone.swift
│   │   ├── DashboardData.swift
│   │   └── Projection.swift
│   │
│   ├── Services/                     # API & business logic
│   │   ├── APIService.swift
│   │   ├── AuthService.swift
│   │   └── KeychainHelper.swift
│   │
│   ├── ViewModels/                   # MVVM view models
│   │   ├── DashboardViewModel.swift
│   │   ├── DailyViewModel.swift
│   │   ├── GoalsViewModel.swift
│   │   ├── BudgetViewModel.swift
│   │   ├── SummaryViewModel.swift
│   │   └── ChatViewModel.swift
│   │
│   ├── Views/                        # SwiftUI views
│   │   ├── Dashboard/
│   │   │   └── DashboardView.swift
│   │   ├── Daily/
│   │   │   └── DailyView.swift
│   │   ├── Goals/
│   │   │   ├── GoalsView.swift
│   │   │   └── GoalFormView.swift
│   │   ├── Budget/
│   │   │   └── BudgetView.swift
│   │   ├── Summary/
│   │   │   └── SummaryView.swift
│   │   ├── Chat/
│   │   │   └── AIChatView.swift
│   │   └── Auth/
│   │       └── LoginView.swift
│   │
│   ├── Components/                   # Reusable UI
│   │   ├── FREMCard.swift
│   │   ├── KPICard.swift
│   │   ├── GoalProjectionCard.swift
│   │   ├── TransactionRow.swift
│   │   └── ProgressRing.swift
│   │
│   └── Utilities/
│       ├── Theme.swift
│       ├── Extensions.swift
│       └── Constants.swift
│
└── FREMTests/
    └── FREMTests.swift
```

---

## Dependencies (Swift Package Manager)

| Package | Purpose |
|---------|---------|
| GoogleSignIn | Google OAuth authentication |
| KeychainAccess | Secure token storage |

---

## Environment Variables Needed

The iOS app needs the backend URL configured:

```swift
// Constants.swift
enum Config {
    static let apiBaseURL = "https://your-frem-app.vercel.app"
    static let googleClientID = "YOUR_GOOGLE_CLIENT_ID"
}
```

---

## Notes

- The iOS app is a **client** to the existing Next.js API - no database changes needed
- Authentication reuses the same Google OAuth client (add iOS bundle ID to Google Console)
- All financial logic (projections, daily targets) lives server-side
- The iOS app focuses on native UX: haptics, widgets, Siri, biometrics
- Color scheme matches the web app: blue-600 primary, slate grays, green/red for income/expense

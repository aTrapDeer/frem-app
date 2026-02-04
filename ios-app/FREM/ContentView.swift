import SwiftUI

struct ContentView: View {
    @State private var auth = AuthService.shared
    @State private var selectedTab = 0

    var body: some View {
        Group {
            if auth.isLoading {
                // Splash / loading
                VStack(spacing: 16) {
                    Text("FREM")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.fremBlue)
                    ProgressView()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.fremBackground)
            } else if !auth.isAuthenticated {
                LoginView()
            } else {
                mainTabView
            }
        }
    }

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Image(systemName: "square.grid.2x2")
                    Text("Dashboard")
                }
                .tag(0)

            DailyView()
                .tabItem {
                    Image(systemName: "calendar.day.timeline.left")
                    Text("Daily")
                }
                .tag(1)

            GoalsView()
                .tabItem {
                    Image(systemName: "target")
                    Text("Goals")
                }
                .tag(2)

            BudgetView()
                .tabItem {
                    Image(systemName: "creditcard")
                    Text("Budget")
                }
                .tag(3)

            SummaryView()
                .tabItem {
                    Image(systemName: "chart.bar")
                    Text("Summary")
                }
                .tag(4)

            SettingsView()
                .tabItem {
                    Image(systemName: "gearshape")
                    Text("Settings")
                }
                .tag(5)
        }
        .tint(.fremBlue)
    }
}

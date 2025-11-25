import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appViewModel: AppViewModel

    var body: some View {
        VStack {
            NavigationStack(path: $appViewModel.navigationPath) {
                contentView
                    .navigationDestination(for: FuelTask.self) { task in
                        TaskDetailView(task: task)
                    }
            }
        }
    }

    @ViewBuilder
    private var contentView: some View {
        switch appViewModel.sessionState {
        case .loading:
            SplashView()
        case .unauthenticated:
            LoginView()
        case .authenticated(let profile):
            DriverHomeView(profile: profile)
        }
    }
}

#Preview {
    RootView()
        .environmentObject(AppViewModel())
}

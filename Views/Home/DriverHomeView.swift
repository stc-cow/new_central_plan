import SwiftUI

struct DriverHomeView: View {
    let profile: DriverProfile
    @EnvironmentObject private var appViewModel: AppViewModel

    private var activeTasks: [FuelTask] {
        appViewModel.tasks.filter { $0.status == .pending || $0.status == .inProgress }
    }

    private var completedTasks: [FuelTask] {
        appViewModel.tasks.filter { $0.status == .completed }
    }

    var body: some View {
        VStack(spacing: 0) {
            if let error = appViewModel.assignmentsErrorMessage {
                ErrorBanner(message: error)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    headerSection
                    TaskListSection(title: "Active Tasks", tasks: activeTasks)
                    if !completedTasks.isEmpty {
                        TaskListSection(title: "Recently Completed", tasks: completedTasks)
                    }
                    HistorySummarySection(fuelLogs: appViewModel.fuelLogs)
                }
                .padding()
            }
            .refreshable {
                await appViewModel.refreshAssignments()
            }
        }
        .background(Color(.systemBackground))
        .navigationTitle("Tasks")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Sign Out") {
                    Task {
                        await appViewModel.signOut()
                    }
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Welcome back")
                .font(.caption)
                .foregroundColor(.secondary)
            Text(profile.displayName)
                .font(.title.weight(.semibold))
            if appViewModel.isLoadingAssignments {
                ProgressView("Syncing assignments…")
                    .progressViewStyle(.linear)
            }
        }
    }
}

private struct ErrorBanner: View {
    let message: String

    var body: some View {
        VStack {
            Text(message)
                .font(.footnote)
                .foregroundColor(.white)
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.red)
        }
    }
}

#Preview {
    NavigationStack {
        DriverHomeView(profile: DriverProfile(
            id: UUID(),
            supabaseUserId: "demo",
            firstName: "Jordan",
            lastName: "Lee",
            phoneNumber: "555-0123",
            certificationNumber: "CERT-41"
        ))
        .environmentObject(AppViewModel())
    }
}

import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    enum SessionState: Equatable {
        case loading
        case unauthenticated
        case authenticated(DriverProfile)
    }

    @Published var sessionState: SessionState = .loading
    @Published var navigationPath = NavigationPath()
    @Published var isAuthenticating = false
    @Published var authErrorMessage: String?
    @Published private(set) var tasks: [FuelTask] = []
    @Published private(set) var fuelLogs: [FuelLog] = []
    @Published var isLoadingAssignments = false
    @Published var assignmentsErrorMessage: String?
    @Published var logSubmissionError: String?
    @Published var taskActionInFlight: Set<UUID> = []
    @Published var isSubmittingLog = false

    private let supabaseService = SupabaseService.shared
    private var realtimeDriverId: UUID?

    private var authenticatedDriver: DriverProfile? {
        if case let .authenticated(profile) = sessionState {
            return profile
        }
        return nil
    }

    init() {
        Task {
            await bootstrapSession()
        }
    }

    func bootstrapSession() async {
        sessionState = .loading
        authErrorMessage = nil
        do {
            let profile = try await supabaseService.restoreSession()
            await handleAuthenticationSuccess(with: profile)
        } catch {
            sessionState = .unauthenticated
        }
    }

    func signIn(email: String, password: String) async {
        guard !email.isEmpty, !password.isEmpty else {
            authErrorMessage = "Email and password are required."
            return
        }

        isAuthenticating = true
        authErrorMessage = nil

        do {
            let profile = try await supabaseService.signIn(email: email, password: password)
            await handleAuthenticationSuccess(with: profile)
        } catch {
            authErrorMessage = error.localizedDescription
            sessionState = .unauthenticated
        }

        isAuthenticating = false
    }

    func signOut() async {
        do {
            try await supabaseService.signOut()
        } catch {
            assignmentsErrorMessage = error.localizedDescription
        }
        sessionState = .unauthenticated
        navigationPath = NavigationPath()
        tasks = []
        fuelLogs = []
        realtimeDriverId = nil
        taskActionInFlight.removeAll()
        logSubmissionError = nil
        isSubmittingLog = false
    }

    func refreshAssignments() async {
        guard let profile = authenticatedDriver else { return }
        await loadAssignments(for: profile)
    }

    func startTask(_ task: FuelTask) async {
        guard let profile = authenticatedDriver else { return }
        taskActionInFlight.insert(task.id)
        assignmentsErrorMessage = nil

        do {
            try await supabaseService.updateTaskStatus(
                taskId: task.id,
                status: .inProgress,
                timestamps: TaskStatusTimestamps(startedAt: Date(), completedAt: nil)
            )
            await loadAssignments(for: profile)
        } catch {
            assignmentsErrorMessage = error.localizedDescription
        }

        taskActionInFlight.remove(task.id)
    }

    func completeTask(_ task: FuelTask, submission: FuelLogSubmission) async {
        guard submission.gallonsDispensed > 0 else {
            logSubmissionError = "Gallons dispensed must be greater than zero."
            return
        }
        guard let profile = authenticatedDriver else { return }

        isSubmittingLog = true
        logSubmissionError = nil
        taskActionInFlight.insert(task.id)

        let now = Date()
        let sanitizedNotes = submission.notes.trimmingCharacters(in: .whitespacesAndNewlines)

        let log = FuelLog(
            id: UUID(),
            taskId: task.id,
            driverId: profile.id,
            gallonsDispensed: submission.gallonsDispensed,
            odometerReading: submission.odometerReading,
            notes: sanitizedNotes,
            createdAt: now
        )

        do {
            try await supabaseService.submitFuelLog(log)
            try await supabaseService.updateTaskStatus(
                taskId: task.id,
                status: .completed,
                timestamps: TaskStatusTimestamps(
                    startedAt: task.startedAt ?? now,
                    completedAt: now
                )
            )
            await loadAssignments(for: profile)
        } catch {
            logSubmissionError = error.localizedDescription
        }

        isSubmittingLog = false
        taskActionInFlight.remove(task.id)
    }

    private func handleAuthenticationSuccess(with profile: DriverProfile) async {
        sessionState = .authenticated(profile)
        navigationPath = NavigationPath()
        await loadAssignments(for: profile)
        configureRealtime(for: profile)
    }

    private func loadAssignments(for profile: DriverProfile) async {
        isLoadingAssignments = true
        assignmentsErrorMessage = nil

        do {
            async let tasksResponse = supabaseService.fetchTasks(driverId: profile.id)
            async let logsResponse = supabaseService.fetchFuelLogs(driverId: profile.id)
            let (tasksResult, logsResult) = try await (tasksResponse, logsResponse)

            tasks = tasksResult.sorted { $0.scheduledAt < $1.scheduledAt }
            fuelLogs = logsResult.sorted { $0.createdAt > $1.createdAt }
        } catch {
            assignmentsErrorMessage = error.localizedDescription
        }

        isLoadingAssignments = false
    }

    private func configureRealtime(for profile: DriverProfile) {
        guard realtimeDriverId != profile.id else { return }
        realtimeDriverId = profile.id

        supabaseService.subscribeToTaskUpdates(driverId: profile.id) { [weak self] in
            await self?.refreshAssignments()
        }

        supabaseService.subscribeToFuelLogUpdates(driverId: profile.id) { [weak self] in
            await self?.refreshAssignments()
        }
    }

    func requireAuthenticatedDriver() -> DriverProfile? {
        authenticatedDriver
    }
}

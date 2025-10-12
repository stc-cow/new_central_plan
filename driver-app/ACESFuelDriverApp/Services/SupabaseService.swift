import Foundation
import Supabase

actor SupabaseService {
    static let shared = SupabaseService()

    private let client: SupabaseClient
    private let iso8601Formatter: ISO8601DateFormatter
    private var taskChannel: RealtimeChannel?
    private var logChannel: RealtimeChannel?

    private init() {
        let configuration = SupabaseConfiguration.shared
        client = SupabaseClient(supabaseURL: configuration.url, supabaseKey: configuration.anonKey)
        iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    }

    func signIn(email: String, password: String) async throws -> DriverProfile {
        let authResponse = try await client.auth.signIn(email: email, password: password)
        guard let userId = authResponse.user?.id else {
            throw SupabaseError.missingUser
        }

        let profile = try await fetchDriverProfile(authUserId: userId)
        return profile
    }

    func restoreSession() async throws -> DriverProfile {
        try await client.auth.refreshCurrentSession()
        guard let userId = client.auth.session?.user.id else {
            throw SupabaseError.missingUser
        }
        return try await fetchDriverProfile(authUserId: userId)
    }

    func signOut() async throws {
        try await client.auth.signOut()
        clearRealtimeSubscriptions()
    }

    func fetchTasks(driverId: UUID) async throws -> [FuelTask] {
        let response: [TaskRecord] = try await client.database
            .from(SupabaseTable.tasks.rawValue)
            .select()
            .eq("assigned_driver_id", value: driverId.uuidString)
            .order("scheduled_at", ascending: true)
            .execute()
            .value

        return response.map { $0.toDomain() }
    }

    func fetchFuelLogs(driverId: UUID, limit: Int = 50) async throws -> [FuelLog] {
        let response: [FuelLogRecord] = try await client.database
            .from(SupabaseTable.fuelLogs.rawValue)
            .select()
            .eq("driver_id", value: driverId.uuidString)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute()
            .value

        return response.map { $0.toDomain() }
    }

    func subscribeToTaskUpdates(driverId: UUID, onChange: @escaping @Sendable () async -> Void) {
        let channel = client.channel("driver-tasks-\(driverId.uuidString)")
        channel.on(.postgresChanges, event: .all, schema: "public", table: SupabaseTable.tasks.rawValue, filter: "assigned_driver_id=eq.\(driverId.uuidString)") { _ in
            Task {
                await onChange()
            }
        }
        channel.subscribe()
        taskChannel = channel
    }

    func subscribeToFuelLogUpdates(driverId: UUID, onChange: @escaping @Sendable () async -> Void) {
        let channel = client.channel("driver-fuel-logs-\(driverId.uuidString)")
        channel.on(.postgresChanges, event: .all, schema: "public", table: SupabaseTable.fuelLogs.rawValue, filter: "driver_id=eq.\(driverId.uuidString)") { _ in
            Task {
                await onChange()
            }
        }
        channel.subscribe()
        logChannel = channel
    }

    func submitFuelLog(_ log: FuelLog) async throws {
        let payload: [String: Any] = [
            "id": log.id.uuidString,
            "task_id": log.taskId.uuidString,
            "driver_id": log.driverId.uuidString,
            "gallons_dispensed": log.gallonsDispensed,
            "odometer_reading": log.odometerReading as Any,
            "notes": log.notes,
            "created_at": iso8601Formatter.string(from: log.createdAt)
        ]

        try await client.database
            .from(SupabaseTable.fuelLogs.rawValue)
            .insert(values: payload)
            .execute()
    }

    func updateTaskStatus(taskId: UUID, status: FuelTask.Status, timestamps: TaskStatusTimestamps) async throws {
        var updatePayload: [String: Any] = [
            "status": status.rawValue,
            "updated_at": iso8601Formatter.string(from: Date())
        ]

        if let startedAt = timestamps.startedAt {
            updatePayload["started_at"] = iso8601Formatter.string(from: startedAt)
        }

        if let completedAt = timestamps.completedAt {
            updatePayload["completed_at"] = iso8601Formatter.string(from: completedAt)
        }

        try await client.database
            .from(SupabaseTable.tasks.rawValue)
            .update(values: updatePayload)
            .eq("id", value: taskId.uuidString)
            .single()
            .execute()
    }

    private func fetchDriverProfile(authUserId: UUID) async throws -> DriverProfile {
        let record: DriverRecord = try await client.database
            .from(SupabaseTable.drivers.rawValue)
            .select()
            .eq("auth_user_id", value: authUserId.uuidString)
            .single()
            .execute()
            .value

        return record.toDomain()
    }

    private func clearRealtimeSubscriptions() {
        if let taskChannel {
            client.removeChannel(taskChannel)
        }
        if let logChannel {
            client.removeChannel(logChannel)
        }
        taskChannel = nil
        logChannel = nil
    }

    enum SupabaseError: Error {
        case missingUser
        case missingDriverProfile
    }
}

struct TaskStatusTimestamps {
    let startedAt: Date?
    let completedAt: Date?
}

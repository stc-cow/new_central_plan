import Foundation

struct DriverProfile: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var supabaseUserId: String
    var firstName: String
    var lastName: String
    var phoneNumber: String
    var certificationNumber: String

    var displayName: String {
        "\(firstName) \(lastName)"
    }
}

struct FuelTask: Identifiable, Codable, Equatable, Hashable {
    enum Status: String, Codable, CaseIterable, Equatable {
        case pending
        case inProgress = "in_progress"
        case completed
        case cancelled
    }

    let id: UUID
    var siteName: String
    var vehicleIdentifier: String
    var scheduledAt: Date
    var status: Status
    var instructions: String
    var fuelType: String
    var capacityGallons: Double
    var priority: Int
    var assignedDriverId: UUID
    var startedAt: Date?
    var completedAt: Date?
    var lastUpdatedAt: Date
}

struct FuelLog: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var taskId: UUID
    var driverId: UUID
    var gallonsDispensed: Double
    var odometerReading: Double?
    var notes: String
    var createdAt: Date
}

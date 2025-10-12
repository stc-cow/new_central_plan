import Foundation

enum SupabaseTable: String {
    case drivers
    case tasks
    case fuelLogs = "fuel_logs"
}

struct DriverRecord: Codable {
    let id: UUID
    let authUserId: UUID
    let firstName: String
    let lastName: String
    let phoneNumber: String
    let certificationNumber: String

    enum CodingKeys: String, CodingKey {
        case id
        case authUserId = "auth_user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case phoneNumber = "phone_number"
        case certificationNumber = "certification_number"
    }

    func toDomain() -> DriverProfile {
        DriverProfile(
            id: id,
            supabaseUserId: authUserId.uuidString,
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber,
            certificationNumber: certificationNumber
        )
    }
}

struct TaskRecord: Codable {
    let id: UUID
    let siteName: String
    let vehicleIdentifier: String
    let scheduledAt: Date
    let status: FuelTask.Status
    let instructions: String
    let fuelType: String
    let capacityGallons: Double
    let priority: Int
    let assignedDriverId: UUID
    let startedAt: Date?
    let completedAt: Date?
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case siteName = "site_name"
        case vehicleIdentifier = "vehicle_identifier"
        case scheduledAt = "scheduled_at"
        case status
        case instructions
        case fuelType = "fuel_type"
        case capacityGallons = "capacity_gallons"
        case priority
        case assignedDriverId = "assigned_driver_id"
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case updatedAt = "updated_at"
    }

    func toDomain() -> FuelTask {
        FuelTask(
            id: id,
            siteName: siteName,
            vehicleIdentifier: vehicleIdentifier,
            scheduledAt: scheduledAt,
            status: status,
            instructions: instructions,
            fuelType: fuelType,
            capacityGallons: capacityGallons,
            priority: priority,
            assignedDriverId: assignedDriverId,
            startedAt: startedAt,
            completedAt: completedAt,
            lastUpdatedAt: updatedAt
        )
    }
}

struct FuelLogRecord: Codable {
    let id: UUID
    let taskId: UUID
    let driverId: UUID
    let gallonsDispensed: Double
    let odometerReading: Double?
    let notes: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case taskId = "task_id"
        case driverId = "driver_id"
        case gallonsDispensed = "gallons_dispensed"
        case odometerReading = "odometer_reading"
        case notes
        case createdAt = "created_at"
    }

    func toDomain() -> FuelLog {
        FuelLog(
            id: id,
            taskId: taskId,
            driverId: driverId,
            gallonsDispensed: gallonsDispensed,
            odometerReading: odometerReading,
            notes: notes,
            createdAt: createdAt
        )
    }
}

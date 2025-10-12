import SwiftUI

struct TaskRow: View {
    let task: FuelTask

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(task.siteName)
                    .font(.headline)
                Spacer()
                StatusBadge(status: task.status)
            }
            VStack(alignment: .leading, spacing: 8) {
                Label(task.vehicleIdentifier, systemImage: "car.fill")
                Label(task.fuelType, systemImage: "fuelpump.fill")
                Label(task.scheduledAt.formatted(date: .numeric, time: .shortened), systemImage: "calendar")
            }
            .labelStyle(.titleAndIcon)
        }
        .foregroundColor(.primary)
    }
}

struct EmptyContentView: View {
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    VStack(spacing: 24) {
        TaskRow(task: FuelTask(
            id: UUID(),
            siteName: "Terminal 5",
            vehicleIdentifier: "Fleet 102",
            scheduledAt: .now,
            status: .pending,
            instructions: "",
            fuelType: "Diesel",
            capacityGallons: 120,
            priority: 1,
            assignedDriverId: UUID(),
            startedAt: nil,
            completedAt: nil,
            lastUpdatedAt: .now
        ))
        EmptyContentView(message: "No items available")
    }
    .padding()
}

import SwiftUI

struct TaskListSection: View {
    let title: String
    let tasks: [FuelTask]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.title3.weight(.semibold))
            VStack(spacing: 12) {
                ForEach(tasks) { task in
                    NavigationLink(value: task) {
                        TaskRow(task: task)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }

                if tasks.isEmpty {
                    EmptyContentView(message: "No tasks available.")
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        TaskListSection(
            title: "Active Tasks",
            tasks: [
                FuelTask(
                    id: UUID(),
                    siteName: "Site 12 - Storage Yard",
                    vehicleIdentifier: "Truck 24",
                    scheduledAt: .now,
                    status: .pending,
                    instructions: "Confirm vehicle is offline before fueling.",
                    fuelType: "Diesel",
                    capacityGallons: 125,
                    priority: 2,
                    assignedDriverId: UUID(),
                    startedAt: nil,
                    completedAt: nil,
                    lastUpdatedAt: .now
                )
            ]
        )
        .padding()
    }
}

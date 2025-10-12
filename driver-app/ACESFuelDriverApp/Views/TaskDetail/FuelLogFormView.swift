import SwiftUI

struct FuelLogFormView: View {
    @Binding var submission: FuelLogSubmission
    let isSubmitting: Bool
    let errorMessage: String?
    let onSubmit: () -> Void

    private let gallonsFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    private let odometerFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Submit Fuel Log")
                .font(.title3.weight(.semibold))

            VStack(alignment: .leading, spacing: 12) {
                Text("Gallons Dispensed")
                    .font(.subheadline.weight(.semibold))
                TextField("0.0", value: $submission.gallonsDispensed, formatter: gallonsFormatter)
                    .keyboardType(.decimalPad)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Odometer (optional)")
                    .font(.subheadline.weight(.semibold))
                TextField("0", value: Binding(
                    get: { submission.odometerReading ?? 0 },
                    set: { submission.odometerReading = $0 == 0 ? nil : $0 }
                ), formatter: odometerFormatter)
                .keyboardType(.numberPad)
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Notes")
                    .font(.subheadline.weight(.semibold))
                TextEditor(text: $submission.notes)
                    .frame(minHeight: 120)
                    .padding(8)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundColor(.red)
            }

            Button(action: onSubmit) {
                if isSubmitting {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(.white)
                } else {
                    Text("Complete Task")
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isSubmitting ? Color.accentColor.opacity(0.6) : Color.accentColor)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .disabled(isSubmitting)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    FuelLogFormView(
        submission: .constant(FuelLogSubmission(gallonsDispensed: 128.5, notes: "Documented before/after photos.")),
        isSubmitting: false,
        errorMessage: nil,
        onSubmit: {}
    )
    .padding()
}

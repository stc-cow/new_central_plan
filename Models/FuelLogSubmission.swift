import Foundation

struct FuelLogSubmission: Equatable {
    var gallonsDispensed: Double
    var odometerReading: Double?
    var notes: String

    init(gallonsDispensed: Double = 0, odometerReading: Double? = nil, notes: String = "") {
        self.gallonsDispensed = gallonsDispensed
        self.odometerReading = odometerReading
        self.notes = notes
    }
}

import Foundation

struct SupabaseConfiguration {
    let url: URL
    let anonKey: String

    static let shared: SupabaseConfiguration = {
        do {
            return try SupabaseConfiguration.load()
        } catch {
            fatalError("Unable to load Supabase configuration: \(error)")
        }
    }()

    private static func load() throws -> SupabaseConfiguration {
        guard let resourceUrl = Bundle.main.url(forResource: "SupabaseConfig", withExtension: "plist") else {
            throw ConfigurationError.missingResourceWithHint(
                "Add Resources/SupabaseConfig.plist (see SupabaseConfig.example.plist or run `pnpm sync:supabase-config`)."
            )
        }

        let data = try Data(contentsOf: resourceUrl)
        let plist = try PropertyListSerialization.propertyList(from: data, options: [], format: nil)

        guard
            let dictionary = plist as? [String: Any],
            let urlString = dictionary["url"] as? String,
            let anonKey = dictionary["anonKey"] as? String,
            let url = URL(string: urlString)
        else {
            throw ConfigurationError.invalidFormat
        }

        return SupabaseConfiguration(url: url, anonKey: anonKey)
    }

    enum ConfigurationError: LocalizedError {
        case missingResourceWithHint(String)
        case missingResource
        case invalidFormat

        var errorDescription: String? {
            switch self {
            case .missingResourceWithHint(let hint):
                return "Supabase configuration missing. \(hint)"
            case .missingResource:
                return "Supabase configuration file not found in bundle."
            case .invalidFormat:
                return "Supabase configuration plist is malformed."
            }
        }
    }
}

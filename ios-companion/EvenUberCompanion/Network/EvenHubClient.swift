import Foundation

/// Communicates with the local Even Hub web app via HTTP
final class EvenHubClient {
    static let shared = EvenHubClient()

    /// Base URL of the Even Hub display app.
    ///
    /// Defaults to localhost because the Even Hub app runs on the phone itself.
    /// Override it (e.g. with a Mac's LAN address) while developing against a
    /// server running on another machine.
    private(set) var baseURLString: String

    private let session: URLSession

    private(set) var isConnected = false
    var onConnectionStatusChanged: ((Bool) -> Void)?

    private static let defaultBaseURL = "http://127.0.0.1:3000"
    private static let baseURLDefaultsKey = "EvenHubBaseURL"

    init(baseURLString: String? = nil) {
        self.baseURLString = baseURLString
            ?? UserDefaults.standard.string(forKey: Self.baseURLDefaultsKey)
            ?? Self.defaultBaseURL

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 5
        config.timeoutIntervalForResource = 10
        config.waitsForConnectivity = false
        self.session = URLSession(configuration: config)
    }

    /// Point the client at a different Even Hub instance. Persisted across launches.
    func setBaseURL(_ urlString: String) {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, URL(string: trimmed) != nil else { return }
        baseURLString = trimmed
        UserDefaults.standard.set(trimmed, forKey: Self.baseURLDefaultsKey)
    }

    /// Send parsed ride data to the Even Hub display app
    func send(_ rideData: RideData, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let endpoint = URL(string: "\(baseURLString)/api/ride-update") else {
            completion(.failure(EvenHubError.invalidBaseURL(baseURLString)))
            return
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(rideData)
        } catch {
            print("❌ Failed to encode ride data: \(error.localizedDescription)")
            completion(.failure(error))
            return
        }

        print("📤 Sending ride data to Even Hub: \(rideData.driverName)")

        session.dataTask(with: request) { [weak self] _, response, error in
            if let error {
                print("❌ Failed to send to Even Hub: \(error.localizedDescription)")
                self?.updateConnectionStatus(false)
                completion(.failure(error))
                return
            }

            // Every remaining path must call `completion` exactly once — an
            // unresolved callback here would hang the listener's error handling.
            guard let httpResponse = response as? HTTPURLResponse else {
                self?.updateConnectionStatus(false)
                completion(.failure(EvenHubError.unexpectedResponse))
                return
            }

            guard (200..<300).contains(httpResponse.statusCode) else {
                print("⚠️ Even Hub returned error: \(httpResponse.statusCode)")
                self?.updateConnectionStatus(false)
                completion(.failure(EvenHubError.httpStatus(httpResponse.statusCode)))
                return
            }

            print("✅ Successfully sent to Even Hub")
            self?.updateConnectionStatus(true)
            completion(.success(()))
        }.resume()
    }

    /// Check if the Even Hub web app is running
    func checkConnection(completion: @escaping (Bool) -> Void) {
        guard let endpoint = URL(string: "\(baseURLString)/health") else {
            DispatchQueue.main.async {
                self.updateConnectionStatus(false)
                completion(false)
            }
            return
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "GET"

        session.dataTask(with: request) { [weak self] _, response, _ in
            let isHealthy = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
            DispatchQueue.main.async {
                self?.updateConnectionStatus(isHealthy)
                completion(isHealthy)
            }
        }.resume()
    }

    private func updateConnectionStatus(_ status: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.isConnected != status else { return }
            self.isConnected = status
            self.onConnectionStatusChanged?(status)
            print(status ? "🟢 Connected to Even Hub" : "🔴 Disconnected from Even Hub")
        }
    }
}

/// Errors surfaced by `EvenHubClient`
enum EvenHubError: LocalizedError {
    case invalidBaseURL(String)
    case unexpectedResponse
    case httpStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL(let url):
            return "Even Hub URL is not valid: \(url)"
        case .unexpectedResponse:
            return "Even Hub returned an unexpected response"
        case .httpStatus(let code):
            return "Even Hub returned HTTP \(code)"
        }
    }
}

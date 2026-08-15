import Foundation

/// Communicates with the local Even Hub web app via HTTP
class EvenHubClient {
    static let shared = EvenHubClient()

    private let baseURL = "http://127.0.0.1:3000"
    private let session: URLSession

    private(set) var isConnected = false
    var onConnectionStatusChanged: ((Bool) -> Void)?

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 5
        config.timeoutIntervalForResource = 10
        self.session = URLSession(configuration: config)
    }

    /// Send parsed ride data to the Even Hub display app
    func send(_ rideData: RideData, completion: @escaping (Result<Void, Error>) -> Void) {
        let endpoint = URL(string: "\(baseURL)/api/ride-update")!

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(rideData)

            print("📤 Sending ride data to Even Hub: \(rideData.driverName)")

            session.dataTask(with: request) { [weak self] data, response, error in
                if let error = error {
                    print("❌ Failed to send to Even Hub: \(error.localizedDescription)")
                    self?.updateConnectionStatus(false)
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        print("✅ Successfully sent to Even Hub")
                        self?.updateConnectionStatus(true)
                        completion(.success(()))
                    } else {
                        let error = NSError(domain: "EvenHubClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode)"])
                        print("⚠️ Even Hub returned error: \(httpResponse.statusCode)")
                        self?.updateConnectionStatus(false)
                        completion(.failure(error))
                    }
                }
            }.resume()
        } catch {
            print("❌ Failed to encode ride data: \(error.localizedDescription)")
            completion(.failure(error))
        }
    }

    /// Check if the Even Hub web app is running
    func checkConnection(completion: @escaping (Bool) -> Void) {
        let endpoint = URL(string: "\(baseURL)/health")!

        var request = URLRequest(url: endpoint)
        request.httpMethod = "GET"

        session.dataTask(with: request) { [weak self] _, response, _ in
            let isHealthy = (response as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async {
                self?.updateConnectionStatus(isHealthy)
                completion(isHealthy)
            }
        }.resume()
    }

    private func updateConnectionStatus(_ status: Bool) {
        DispatchQueue.main.async { [weak self] in
            if self?.isConnected != status {
                self?.isConnected = status
                self?.onConnectionStatusChanged?(status)
                print(status ? "🟢 Connected to Even Hub" : "🔴 Disconnected from Even Hub")
            }
        }
    }
}

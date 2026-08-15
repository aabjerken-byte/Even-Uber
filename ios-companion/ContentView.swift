import SwiftUI

struct ContentView: View {
    @ObservedObject var permissionManager: NotificationPermissions
    @ObservedObject var listener: UberNotificationListener
    @State private var lastRide: RideData?
    @State private var lastError: String?
    @State private var showingError = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    HStack {
                        Image(systemName: "car.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.blue)
                        VStack(alignment: .leading) {
                            Text("Even Uber")
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Companion App")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .padding()

                // Status Section
                StatusView(
                    permissionManager: permissionManager,
                    listener: listener
                )
                .padding()

                // Last Notification
                if let ride = lastRide {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Last Notification")
                            .font(.headline)

                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Driver:")
                                    .fontWeight(.semibold)
                                Text(ride.driverName)
                                Spacer()
                                Text("⭐ \(String(format: "%.1f", ride.driverRating))")
                                    .font(.caption)
                            }

                            HStack {
                                Text("Vehicle:")
                                    .fontWeight(.semibold)
                                Text("\(ride.vehicleColor) \(ride.vehicleMake) \(ride.vehicleModel)")
                            }

                            HStack {
                                Text("License Plate:")
                                    .fontWeight(.semibold)
                                Text(ride.licensePlate)
                                    .font(.monospaced(.body)())
                            }

                            HStack {
                                Text("ETA:")
                                    .fontWeight(.semibold)
                                Text("\(ride.etaMinutes) minute\(ride.etaMinutes == 1 ? "" : "s")")
                            }

                            HStack {
                                Text("Sent:")
                                    .fontWeight(.semibold)
                                Text(formatTime(ride.timestamp))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                    .padding()
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 32))
                            .foregroundColor(.gray)
                        Text("No notifications yet")
                            .font(.headline)
                        Text("Order a ride in the Uber app to see driver info here")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding()
                }

                // Error Display
                if let error = lastError {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                            Text("Error")
                                .fontWeight(.semibold)
                        }
                        Text(error)
                            .font(.caption)
                    }
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                    .padding()
                }

                Spacer()

                // Permissions Button
                if !permissionManager.isAuthorized {
                    Button(action: {
                        permissionManager.requestPermission { _ in }
                    }) {
                        HStack {
                            Image(systemName: "bell.badge.fill")
                            Text("Enable Notifications")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .padding()
                }

                // Settings Link
                NavigationLink(destination: SettingsView(permissionManager: permissionManager)) {
                    HStack {
                        Image(systemName: "gear")
                        Text("Settings")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                .padding()
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onReceive(listener.$onNotificationReceived, perform: { ride in
            if let ride = ride {
                lastRide = ride
                lastError = nil
            }
        })
        .onReceive(listener.$onError, perform: { error in
            if let error = error {
                lastError = error
                showingError = true
            }
        })
        .alert("Error", isPresented: $showingError, actions: {
            Button("OK") {
                showingError = false
            }
        }, message: {
            Text(lastError ?? "Unknown error")
        })
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

#Preview {
    ContentView(
        permissionManager: NotificationPermissions.shared,
        listener: UberNotificationListener.shared
    )
}

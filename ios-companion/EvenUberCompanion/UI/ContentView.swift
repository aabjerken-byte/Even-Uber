import SwiftUI
import UIKit

struct ContentView: View {
    @ObservedObject var permissionManager: NotificationPermissions
    @ObservedObject var listener: UberNotificationListener
    @State private var showingError = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    header

                    StatusView(
                        permissionManager: permissionManager,
                        listener: listener
                    )
                    .padding(.horizontal)

                    if let ride = listener.lastRide {
                        lastNotification(ride)
                    } else {
                        emptyState
                    }

                    if let error = listener.lastError {
                        errorBanner(error)
                    }

                    if !permissionManager.isAuthorized {
                        Button {
                            permissionManager.requestPermission { _ in }
                        } label: {
                            Label("Enable Notifications", systemImage: "bell.badge.fill")
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                        }
                        .padding(.horizontal)
                    }

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
                        .background(Color(uiColor: .systemGray6))
                        .cornerRadius(10)
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onChange(of: listener.lastError) { newValue in
            showingError = newValue != nil
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { showingError = false }
        } message: {
            Text(listener.lastError ?? "Unknown error")
        }
    }

    // MARK: - Sections

    private var header: some View {
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
        .background(Color(uiColor: .systemGray6))
        .cornerRadius(12)
        .padding(.horizontal)
    }

    private func lastNotification(_ ride: RideData) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Last Notification")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Driver:").fontWeight(.semibold)
                    Text(ride.driverName)
                    Spacer()
                    Text("⭐ \(String(format: "%.1f", ride.driverRating))")
                        .font(.caption)
                }

                HStack {
                    Text("Vehicle:").fontWeight(.semibold)
                    Text("\(ride.vehicleColor) \(ride.vehicleMake) \(ride.vehicleModel)")
                }

                HStack {
                    Text("License Plate:").fontWeight(.semibold)
                    Text(ride.licensePlate)
                        .monospaced()
                }

                HStack {
                    Text("ETA:").fontWeight(.semibold)
                    Text("\(ride.etaMinutes) minute\(ride.etaMinutes == 1 ? "" : "s")")
                }

                HStack {
                    Text("Sent:").fontWeight(.semibold)
                    Text(ride.timestamp, style: .time)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(uiColor: .systemGray6))
            .cornerRadius(8)
        }
        .padding(.horizontal)
    }

    private var emptyState: some View {
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
        .background(Color(uiColor: .systemGray6))
        .cornerRadius(12)
        .padding(.horizontal)
    }

    private func errorBanner(_ error: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundColor(.red)
                Text("Error").fontWeight(.semibold)
            }
            Text(error).font(.caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}

#Preview {
    ContentView(
        permissionManager: NotificationPermissions.shared,
        listener: UberNotificationListener.shared
    )
}

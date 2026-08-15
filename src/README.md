# Source Code Structure

## Phase 1 Project Layout

```
src/
├── backend/           # ASP.NET Core microservice for Uber API proxy
│   ├── Controllers/   # Ride, Driver, Location endpoints
│   ├── Services/      # UberService, LocationService, etc.
│   ├── Models/        # Ride, Driver, Vehicle data models
│   └── appsettings.json
├── frontend/          # React or Blazor AR UI
│   ├── components/    # RideCard, MapView, LocationTracker
│   ├── pages/         # Main ride view
│   └── services/      # API client, WebSocket manager
├── shared/            # Shared types and constants
│   └── types.ts       # Ride, Driver, Vehicle interfaces
└── docs/              # API specs, architecture diagrams
    └── ARCHITECTURE.md
```

To be populated as Phase 1 development begins.

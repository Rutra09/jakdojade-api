
class RouteQueryBuilder {
    constructor() {
        this.query = {
            engine: "DEFAULT",
            fetchType: "SYNC",
            routesCorrelation: "NONE",
            userLocation: null,
            searchQuery: {
                realtimeSearchMode: "REALTIME_ENABLED",
                routesCount: 6,
                publicTransportOptions: {
                    avoidChanges: "DEFAULT",
                    avoidVehicles: [],
                    prohibitedVehicles: [],
                    prohibitedOperators: [],
                    avoidLineTypes: [],
                    accessibilityOptions: "NONE",
                    preferredLines: [],
                    avoidLines: [],
                    forcedChangeTime: null
                }
            },
            userConnectionTypePreference: "OPTIMAL"
        };
    }

    from(location) {
        this.query.searchQuery.start = location;
        return this;
    }

    to(location) {
        this.query.searchQuery.destination = location;
        return this;
    }

    departingAt(date) {
        this.query.searchQuery.timeOptions = {
            dateTime: date.toISOString().split('.')[0] + '+01:00', // Simplified ISO handling
            queryTimeType: "DEPARTURE"
        };
        return this;
    }

    arrivingAt(date) {
        this.query.searchQuery.timeOptions = {
            dateTime: date.toISOString().split('.')[0] + '+01:00',
            queryTimeType: "ARRIVAL"
        };
        return this;
    }

    routesCount(count) {
        this.query.searchQuery.routesCount = count;
        return this;
    }

    avoidLine(line) {
        if (!this.query.searchQuery.publicTransportOptions.avoidLines.includes(line)) {
            this.query.searchQuery.publicTransportOptions.avoidLines.push(String(line));
        }
        return this;
    }

    avoidVehicle(vehicleType) {
        if (!this.query.searchQuery.publicTransportOptions.avoidVehicles.includes(vehicleType)) {
            this.query.searchQuery.publicTransportOptions.avoidVehicles.push(vehicleType);
        }
        return this;
    }

    prohibitVehicle(vehicleType) {
         if (!this.query.searchQuery.publicTransportOptions.prohibitedVehicles.includes(vehicleType)) {
            this.query.searchQuery.publicTransportOptions.prohibitedVehicles.push(vehicleType);
        }
        return this;
    }

    prohibitOperator(operator) {
        if (!this.query.searchQuery.publicTransportOptions.prohibitedOperators.includes(operator)) {
            this.query.searchQuery.publicTransportOptions.prohibitedOperators.push(operator);
        }
        return this;
    }

    avoidLineType(lineType) {
        if (!this.query.searchQuery.publicTransportOptions.avoidLineTypes.includes(lineType)) {
            this.query.searchQuery.publicTransportOptions.avoidLineTypes.push(lineType);
        }
        return this;
    }

    preferLine(line) {
        if (!this.query.searchQuery.publicTransportOptions.preferredLines.includes(String(line))) {
            this.query.searchQuery.publicTransportOptions.preferredLines.push(String(line));
        }
        return this;
    }

    avoidChanges(mode = "DEFAULT") {
        // Modes: DEFAULT, NO_CHANGES , AVOID_CHANGES
        this.query.searchQuery.publicTransportOptions.avoidChanges = mode;
        return this;
    }

    connectionType(preference = "OPTIMAL") {
        // Preferences: OPTIMAL, FAST, CONVENIENT,
        this.query.userConnectionTypePreference = preference;
        return this;
    }

    forcedChangeTime(minutes) {
        this.query.searchQuery.publicTransportOptions.forcedChangeTime = minutes;
        return this;
    }

    wheelchairAccessible() {
        this.query.searchQuery.publicTransportOptions.accessibilityOptions = "ALL_VEHICLES_WHEELCHAIR_ACCESSIBLE";
        return this;
    }

    build() {
        if (!this.query.searchQuery.start || !this.query.searchQuery.destination) {
            throw new Error("Start and destination are required.");
        }
        // Time defaults to now if not set? API might handle it, or we should set it.
        if (!this.query.searchQuery.timeOptions) {
             const now = new Date();
             this.departingAt(now);
        }
        return this.query;
    }
}

module.exports = RouteQueryBuilder;

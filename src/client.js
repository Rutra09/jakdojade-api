
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getHeaders, generateSignature } = require('./utils');

class JakdojadeClient {
    constructor(options = {}) {
        this.baseUrl = 'https://api.jakdojade.pl';
        this.deviceId = options.deviceId || `device-web-${uuidv4()}`;
        this.profileLogin = options.profileLogin || '';
        this.passwordHash = options.passwordHash || ''; 
    }

    async register() {
        if (this.profileLogin && this.passwordHash) {
            return;
        }

        const url = `${this.baseUrl}/api/profiles/v2/register-anonymous`;
        const headers = getHeaders(this.deviceId);
        
        // Registration doesn't need sign or profile login
        try {
            console.log('Registering new anonymous device...');
            const response = await axios.post(url, {}, { headers });
            this.profileLogin = response.data.profileLogin;
            this.passwordHash = response.data.passwordHash;
            console.log('Registered anonymous user:', this.profileLogin);
            
            // Return credentials for reuse
            return {
                profileLogin: this.profileLogin,
                passwordHash: this.passwordHash,
                deviceId: this.deviceId
            };
        } catch (error) {
            console.error('Registration failed:', error.message);
            if (error.response) {
                console.error(JSON.stringify(error.response.data));
            }
            throw error;
        }
    }

    async _request(method, endpoint, data = null, params = null) {
        if (!this.profileLogin || !this.passwordHash) {
            await this.register();
        }

        const url = `${this.baseUrl}${endpoint}`;
        
        // Path for signing must be lowercase path name
        const path = endpoint.toLowerCase();
        
        const headers = getHeaders(this.deviceId);
        
        // Headers updates
        headers['X-jd-param-profile-login'] = this.profileLogin;
        const timestamp = headers['X-jd-timestamp'];
        
        // Generate signature
        const signature = generateSignature(
            path, 
            data, 
            params, 
            this.profileLogin, 
            this.passwordHash, 
            timestamp
        );
        
        headers['X-jd-sign'] = signature;
        
        // Log for debugging
        // console.log(`Requesting ${method} ${url}`);
        // console.log('Headers:', JSON.stringify(headers, null, 2));

        try {
            const response = await axios({
                method,
                url,
                data,
                params,
                headers
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                console.error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }


    async searchRoute(start, destination, timeOptions, routeOptions = {}) {
        const defaultTransportOptions = {
            avoidChanges: "DEFAULT",
            avoidVehicles: [],
            prohibitedVehicles: [],
            prohibitedOperators: [],
            avoidLineTypes: [],
            accessibilityOptions: "NONE",
            preferredLines: [],
            avoidLines: [],
            forcedChangeTime: null
        };

        const publicTransportOptions = { ...defaultTransportOptions, ...routeOptions };

        const payload = {
            engine: "DEFAULT",
            fetchType: "SYNC",
            routesCorrelation: "NONE",
            userLocation: null,
            searchQuery: {
                start,
                destination,
                timeOptions,
                realtimeSearchMode: "REALTIME_ENABLED",
                routesCount: 6,
                userConnectionTypePreference: "OPTIMAL",
                publicTransportOptions
            }
        };

        const response = await this._request('POST', '/api/jd/v3/routes', payload);
        
        // Parse the raw response into a friendlier format
        if (response.routes) {
            response.routes = response.routes.map(r => this._parseRoute(r));
        }
        
        return response;
    }

    async search(payload) {
        // If it's a builder instance (has build method), build it
        if (payload && typeof payload.build === 'function') {
            payload = payload.build();
        }
        
        const response = await this._request('POST', '/api/jd/v3/routes', payload);
        
        if (response.routes) {
            response.routes = response.routes.map(r => this._parseRoute(r));
        }
        
        return response;
    }

    _parseRoute(route) {
        // Calculate basic stats if missing
        if (!route.routeParts || route.routeParts.length === 0) return route;

        const parts = route.routeParts;
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];

        // Extract start/end times
        const startTime = firstPart.startDeparture ? firstPart.startDeparture.departureTime : null;
        const endTime = lastPart.targetArrival ? lastPart.targetArrival.arrivalTime : null;
        
        // Calculate duration in minutes if possible
        let durationMinutes = 0;
        if (startTime && endTime) {
            // timestamps are usually ISO strings or similar
            // They might be objects { dateTime: "..." } based on HAR
            const start = new Date(startTime.dateTime || startTime);
            const end = new Date(endTime.dateTime || endTime);
            durationMinutes = Math.round((end - start) / 60000);
        }

        // Simplify segments
        const segments = parts.map((part, index) => {
            const type = part.routePartType; // 'VEHICLE_TRANSPORT', 'WALK'
            
            const startDt = part.startDeparture && part.startDeparture.dateTime;
            const endDt = part.targetArrival && part.targetArrival.dateTime;
            
            let from = 'Unknown';
            let to = 'Unknown';
            
            // Try to extract locations
            if (type === 'VEHICLE_TRANSPORT' && part.routeVehicle && part.routeVehicle.routeStops) {
                 const stops = part.routeVehicle.routeStops;
                 const startIdx = part.routeVehicle.stopsStartIndex;
                 const endIdx = part.routeVehicle.stopsEndIndex;
                 
                 // Access: stops[i].lineStop.stopPoint.stopName
                 if (stops[startIdx] && stops[startIdx].lineStop && stops[startIdx].lineStop.stopPoint) {
                     from = stops[startIdx].lineStop.stopPoint.stopName;
                 }
                 if (stops[endIdx] && stops[endIdx].lineStop && stops[endIdx].lineStop.stopPoint) {
                     to = stops[endIdx].lineStop.stopPoint.stopName;
                 }
            } else {
                 // For WALK
                 from = 'Point'; 
                 to = 'Point';
            }

            const segment = {
                type,
                duration: Math.round((part.durationSeconds || 0) / 60),
                distance: part.routePartDistanceMeters,
                startTime: startDt,
                endTime: endDt,
                from,
                to
            };

            if (type === 'VEHICLE_TRANSPORT' && part.routeVehicle) {
                segment.type = 'VEHICLE';
                // Access: routeLine.line.lineDisplayName.lineName
                if (part.routeVehicle.routeLine && part.routeVehicle.routeLine.line) {
                    const lineObj = part.routeVehicle.routeLine.line;
                    segment.line = lineObj.lineDisplayName?.lineName || (lineObj.lineDisplayName?.name || 'Unknown');
                    segment.vehicleType = lineObj.vehicleType || 'BUS'; 
                    segment.direction = part.routeVehicle.routeLine.lineHeadingText || '';
                } else if (part.routeVehicle.routeLine) {
                     // Fallback
                     const line = part.routeVehicle.routeLine;
                     segment.line = line.lineDisplayName?.lineName || 'Unknown';
                     segment.vehicleType = line.vehicleType || 'BUS'; 
                     segment.direction = line.lineHeadingText || '';
                }
            } else if (type === 'WALK') {
                 segment.type = 'WALK';
                 segment.vehicleType = 'WALK';
                 segment.line = 'Walk';
                 segment.direction = '';
            }

            return segment;
        });

        // Count changes (transit parts - 1)
        const transitParts = segments.filter(s => s.type === 'VEHICLE');
        const changes = Math.max(0, transitParts.length - 1);
        
        // Calculate total duration properly if missing
        if (durationMinutes === 0 && segments.length > 0) {
             const first = segments[0];
             const last = segments[segments.length - 1];
             if (first.startTime && last.endTime) {
                  const start = new Date(first.startTime);
                  const end = new Date(last.endTime);
                  durationMinutes = Math.round((end - start) / 60000);
             }
        }

        return {
            ...route,
            duration: durationMinutes,
            changes: changes,
            segments: segments,
            startTime: startTime && (startTime.dateTime || startTime),
            endTime: endTime && (endTime.dateTime || endTime)
        };
    }
    
    async locationSearch(query, citySymbol = 'WARSZAWA') {
        const params = {
            suggestions_search_engine: 'MIXED',
            query: query,
            locale: 'en',
            no_user_points: 'false',
            city_symbol: citySymbol
        };
        
        // Note: locations endpoint is v2
        return this._request('GET', '/api/jd/v2/locations', null, params);
    }
}

module.exports = JakdojadeClient;

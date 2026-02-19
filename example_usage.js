const { JakdojadeClient, RouteQueryBuilder } = require('./src/index');
const fs = require('fs');

async function main() {
    console.log('Initializing Jakdojade Client...');
    
    const client = new JakdojadeClient();
    
    // Set time to tomorrow 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    const start = {
        citySymbol: "WARSZAWA",
        coordinate: { y_lat: 52.2319, x_lon: 21.0067 },
        locationType: "ADDRESS",
        locationName: "Plac Defilad 1"
    };

    const destination = {
        citySymbol: "WARSZAWA",
        coordinate: { y_lat: 52.22997, x_lon: 21.068713 },
        locationType: "STOP_POINT",
        locationName: "Międzynarodowa",
        locationCode: "209802"
    };

    console.log('\n--- Testing Route Search with Builder ---');
    try {
        const query = new RouteQueryBuilder()
            .from(start)
            .to(destination)
            .departingAt(tomorrow)
            .avoidLine(509)
            .avoidLine(159)
            // .prohibitVehicle("VEHICLE_TYPE_TRAIN")
            .avoidChanges("AVOID_CHANGES")
            .connectionType("FAST")
            .build();

        console.log(`Searching route...`);
        const routes = await client.search(query);
        
        //dump the json
        if (routes.routes && routes.routes.length > 0) {
            const fs = require('fs');
            fs.writeFileSync('route_dump.json', JSON.stringify(routes.routes[0], null, 2));
            console.log('Dumped first route to route_dump.json');
            console.log(`Found ${routes.routes.length} routes.`);
            
            const firstRoute = routes.routes[0];
            console.log('\n--- Best Route Option ---');
            console.log(`Start: ${firstRoute.startTime}`);
            console.log(`End:   ${firstRoute.endTime}`);
            console.log(`Duration: ${firstRoute.duration} min`);
            console.log(`Changes:  ${firstRoute.changes}`);
            console.log('\nSegments:');
            
            firstRoute.segments.forEach((seg, index) => {
                const time = seg.startTime ? seg.startTime.split('T')[1].substring(0, 5) : '??:??';
                if (seg.type === 'VEHICLE') {
                    console.log(`  ${time} [${seg.vehicleType} ${seg.line}] ${seg.from} -> ${seg.to} (${seg.duration} min)`);
                    console.log(`         Dir: ${seg.direction}`);
                } else {
                    console.log(`  ${time} [WALK] ${seg.from} -> ${seg.to} (${seg.duration} min, ${seg.distance}m)`);
                }
            });
            
        } else {
            console.log('No routes found.');
            if (routes.error) console.log('Error:', routes.error);
        }

    } catch (e) {
        console.error('Route search failed:', e);
    }
}

main();

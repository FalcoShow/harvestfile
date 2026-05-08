// lib/sellscore/reference-elevators.ts
//
// The 25 representative elevators across OH/IN/IL/MI/eastern IA used to
// populate county_basis_history during the Task 3.2 backfill. For Sell
// Score v1, these double as the live-bid lookup targets — when a farm in
// county X requests a recommendation, we pull live cash bids from this
// elevator's Barchart locationId.
//
// This is reference/static data (rarely changes). For per-farm elevator
// preferences (which is what the sellscore_elevators DB table is for),
// see data-fetcher.ts.

export interface ReferenceElevator {
  countyFips: string;
  countyName: string;
  state: string;
  region: string;
  elevatorId: string;       // Barchart locationId (text)
  elevatorName: string;
  company: string;
  city: string;
  elevatorState: string;
  zip: string;
  lat: number;
  lng: number;
}

export const REFERENCE_ELEVATORS: ReferenceElevator[] = [
  { countyFips: '39173', countyName: 'Wood',       state: 'OH', region: 'NW',            elevatorId: '86389', elevatorName: 'Bowling Green',                company: 'Luckey Farmers, Inc.',              city: 'Bowling Green', elevatorState: 'OH', zip: '43402', lat: 41.357028,  lng: -83.646572  },
  { countyFips: '39099', countyName: 'Mahoning',   state: 'OH', region: 'NE',            elevatorId: '47232', elevatorName: 'Canfield',                     company: 'Heritage Cooperative',              city: 'Canfield',      elevatorState: 'OH', zip: '44406', lat: 41.019481,  lng: -80.770196  },
  { countyFips: '39065', countyName: 'Hardin',     state: 'OH', region: 'central',       elevatorId: '21601', elevatorName: 'Kenton',                       company: 'Heritage Cooperative',              city: 'Kenton',        elevatorState: 'OH', zip: '43326', lat: 40.629751,  lng: -83.598207  },
  { countyFips: '39037', countyName: 'Darke',      state: 'OH', region: 'SW',            elevatorId: '16568', elevatorName: 'Keller Grain',                 company: 'Keller Grain & Feed, Inc.',         city: 'Greenville',    elevatorState: 'OH', zip: '45331', lat: 40.1507037, lng: -84.5252908 },
  { countyFips: '39129', countyName: 'Pickaway',   state: 'OH', region: 'SE',            elevatorId: '63640', elevatorName: 'Circleville, CAH',             company: 'Cargill US',                        city: 'Circleville',   elevatorState: 'OH', zip: '43113', lat: 39.60317,   lng: -82.94912   },
  { countyFips: '18007', countyName: 'Benton',     state: 'IN', region: 'NW',            elevatorId: '22030', elevatorName: 'Fowler',                       company: 'Primient Grain',                    city: 'Fowler',        elevatorState: 'IN', zip: '47944', lat: 40.61385,   lng: -87.318711  },
  { countyFips: '18003', countyName: 'Allen',      state: 'IN', region: 'NE',            elevatorId: '79331', elevatorName: 'New Haven',                    company: 'ADM Grain',                         city: 'New Haven',     elevatorState: 'IN', zip: '46774', lat: 41.07446,   lng: -85.0305    },
  { countyFips: '18157', countyName: 'Tippecanoe', state: 'IN', region: 'central',       elevatorId: '63999', elevatorName: 'Linden, CAH',                  company: 'Cargill US',                        city: 'Linden',        elevatorState: 'IN', zip: '47955', lat: 40.196278,  lng: -86.906955  },
  { countyFips: '18051', countyName: 'Gibson',     state: 'IN', region: 'SW',            elevatorId: '82244', elevatorName: 'Princeton Central',            company: 'Superior Ag',                       city: 'Princeton',     elevatorState: 'IN', zip: '47670', lat: 38.35522,   lng: -87.56565   },
  { countyFips: '18031', countyName: 'Decatur',    state: 'IN', region: 'SE',            elevatorId: '4455',  elevatorName: 'Azalia Waldron',               company: 'Azalia Elevator Inc.',              city: 'Waldron',       elevatorState: 'IN', zip: '46182', lat: 39.471545,  lng: -85.673963  },
  { countyFips: '17015', countyName: 'Carroll',    state: 'IL', region: 'NW',            elevatorId: '31300', elevatorName: 'CGB-Mt. Carroll',              company: 'Balk Grain and Trucking, Inc.',     city: 'Mt Carroll',    elevatorState: 'IL', zip: '61053', lat: 42.08065,   lng: -89.987     },
  { countyFips: '17091', countyName: 'Kankakee',   state: 'IL', region: 'NE',            elevatorId: '26257', elevatorName: 'Bourbonnais',                  company: 'FS Grain',                          city: 'Bourbonnais',   elevatorState: 'IL', zip: '60914', lat: 41.189991,  lng: -87.853327  },
  { countyFips: '17113', countyName: 'McLean',     state: 'IL', region: 'central',       elevatorId: '53927', elevatorName: 'Holder',                       company: 'Evergreen FS',                      city: 'Downs',         elevatorState: 'IL', zip: '61736', lat: 40.4509956, lng: -88.8086042 },
  { countyFips: '17119', countyName: 'Madison',    state: 'IL', region: 'SW',            elevatorId: '82899', elevatorName: 'NEW DOUGLAS',                  company: 'Top Ag Elevator',                   city: 'New Douglas',   elevatorState: 'IL', zip: '62074', lat: 38.932334,  lng: -89.661298  },
  { countyFips: '17019', countyName: 'Champaign',  state: 'IL', region: 'SE',            elevatorId: '83059', elevatorName: 'Champaign',                    company: 'Total Grain Marketing',             city: 'Champaign',     elevatorState: 'IL', zip: '61826', lat: 40.15946,   lng: -88.315092  },
  { countyFips: '26021', countyName: 'Berrien',    state: 'MI', region: 'SW',            elevatorId: '6612',  elevatorName: 'Decatur, CAH',                 company: 'Cargill US',                        city: 'Decatur',       elevatorState: 'MI', zip: '49045', lat: 42.10895,   lng: -85.97066   },
  { countyFips: '26091', countyName: 'Lenawee',    state: 'MI', region: 'SE',            elevatorId: '20966', elevatorName: 'Jasper',                       company: 'Michigan Agricultural Commodities', city: 'Jasper',        elevatorState: 'MI', zip: '49248', lat: 41.79383,   lng: -84.038396  },
  { countyFips: '26145', countyName: 'Saginaw',    state: 'MI', region: 'central',       elevatorId: '36770', elevatorName: 'Hemlock',                      company: 'The Andersons',                     city: 'Hemlock',       elevatorState: 'MI', zip: '48626', lat: 43.410029,  lng: -84.227183  },
  { countyFips: '26157', countyName: 'Tuscola',    state: 'MI', region: 'NE',            elevatorId: '9386',  elevatorName: 'Frankenmuth Area',             company: 'Star of the West Milling',          city: 'Frankenmuth',   elevatorState: 'MI', zip: '48734', lat: 43.3315234, lng: -83.7375413 },
  { countyFips: '26067', countyName: 'Ionia',      state: 'MI', region: 'NW',            elevatorId: '37871', elevatorName: 'Musgrove Grain - Lake Odessa', company: 'Musgrove Grain LLC',                city: 'Lake Odessa',   elevatorState: 'MI', zip: '48849', lat: 42.798915,  lng: -85.0746599 },
  { countyFips: '19045', countyName: 'Clinton',    state: 'IA', region: 'NE',            elevatorId: '55552', elevatorName: 'Dewitt',                       company: 'River Valley Cooperative',          city: 'DeWitt',        elevatorState: 'IA', zip: '52742', lat: 41.8145,    lng: -90.53776   },
  { countyFips: '19163', countyName: 'Scott',      state: 'IA', region: 'east-central',  elevatorId: '55556', elevatorName: 'Eldridge',                     company: 'River Valley Cooperative',          city: 'Eldridge',      elevatorState: 'IA', zip: '52748', lat: 41.65657,   lng: -90.583383  },
  { countyFips: '19113', countyName: 'Linn',       state: 'IA', region: 'central',       elevatorId: '85893', elevatorName: 'CARGILL - CR',                 company: 'Cedar County Coop',                 city: 'Cedar Rapids',  elevatorState: 'IA', zip: '52401', lat: 41.969871,  lng: -91.650252  },
  { countyFips: '19103', countyName: 'Johnson',    state: 'IA', region: 'south-central', elevatorId: '85888', elevatorName: 'WEST BRANCH',                  company: 'Cedar County Coop',                 city: 'West Branch',   elevatorState: 'IA', zip: '52538', lat: 41.7229891, lng: -91.3455189 },
  { countyFips: '19013', countyName: 'Black Hawk', state: 'IA', region: 'north-central', elevatorId: '87473', elevatorName: 'WASHBURN',                     company: 'Heartland Coop',                    city: 'Washburn',      elevatorState: 'IA', zip: '50706', lat: 42.41271,   lng: -92.265637  },
];

/**
 * Look up the representative elevator for a given county FIPS code.
 * Returns undefined if the county isn't in our reference set.
 */
export function getReferenceForCounty(countyFips: string): ReferenceElevator | undefined {
  return REFERENCE_ELEVATORS.find((e) => e.countyFips === countyFips);
}

/**
 * Haversine great-circle distance in miles.
 */
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius (miles)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest reference elevator to a given lat/lng. Used as a fallback
 * when a farm's county isn't in the 25-county reference set.
 */
export function findClosestReference(lat: number, lng: number): ReferenceElevator {
  let closest = REFERENCE_ELEVATORS[0];
  let minDist = haversineMiles(lat, lng, closest.lat, closest.lng);
  for (const e of REFERENCE_ELEVATORS) {
    const d = haversineMiles(lat, lng, e.lat, e.lng);
    if (d < minDist) {
      minDist = d;
      closest = e;
    }
  }
  return closest;
}
//Author - Aditya
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

const STATE_COORDS = {
  AL: [32.806671, -86.791130], AK: [61.370716, -152.404419], AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123], CA: [36.116203, -119.681564], CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371], DE: [39.318523, -75.507141], DC: [38.897438, -77.026817],
  FL: [27.766279, -81.686783], GA: [33.040619, -83.643074], HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478828], IL: [40.349457, -88.986137], IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526], KS: [38.526600, -96.726486], KY: [37.668140, -84.670067],
  LA: [31.169546, -91.867805], ME: [44.693947, -69.381927], MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106], MI: [43.326618, -84.536095], MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696], MO: [38.456085, -92.288368], MT: [46.921925, -110.454353],
  NE: [41.125370, -98.268082], NV: [38.313515, -117.055374], NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011], NM: [34.840515, -106.248482], NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419], ND: [47.528912, -99.784012], OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917], OR: [44.572021, -122.070938], PA: [40.590752, -77.209755],
  RI: [41.680893, -71.511780], SC: [33.856892, -80.945007], SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345], TX: [31.054487, -97.563461], UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686], VA: [37.769337, -78.169968], WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954456], WI: [44.268543, -89.616508], WY: [42.755966, -107.302490],
  AS: [-14.270972, -170.132217], GU: [13.444304, 144.793731],
  MP: [15.097900, 145.673900], PR: [18.220833, -66.590149], VI: [18.335765, -64.896335],
};

function getColor(count, maxCount) {
  const ratio = Math.min(count / (maxCount * 0.6), 1);
  const r = Math.round(79 + ratio * (239 - 79));
  const g = Math.round(70 + ratio * (68 - 70));
  const b = Math.round(229 + ratio * (68 - 229));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function USMap({ data }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400">No map data available</div>;
  }

  const maxCount = Math.max(...data.map((d) => Number(d.disaster_count)));

  return (
    <MapContainer center={[39.8, -98.5]} zoom={4} scrollWheelZoom={true} className="rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map((state) => {
        const coords = STATE_COORDS[state.state_abbrev];
        if (!coords) return null;
        const count = Number(state.disaster_count);
        const radius = 6 + (count / maxCount) * 30;
        return (
          <CircleMarker
            key={state.state_abbrev}
            center={coords}
            radius={radius}
            pathOptions={{
              fillColor: getColor(count, maxCount),
              fillOpacity: 0.7,
              color: "#fff",
              weight: 1,
            }}
          >
            <Tooltip>
              <strong>{state.state_name}</strong>
              <br />
              Disasters: {count.toLocaleString()}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

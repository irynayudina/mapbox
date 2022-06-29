import React, { useRef, useEffect, useState } from "react"
import mapboxgl from "mapbox-gl"
import geojson from "./geojson.geojson"
import "mapbox-gl/dist/mapbox-gl.css"
import "./popup.css"
mapboxgl.accessToken = "pk.eyJ1IjoibGNkZXNpZ25zIiwiYSI6ImNrbGdxcXQ1NDI3NmMydnRreTZwM3k0YnoifQ.gzPL-l7g-Dw2nOg4gdVb9w";

const App = () => {
  const mapContainer = useRef()

  const [lng, setLng] = useState(-122.25948);
  const [lat, setLat] = useState(37.87221);
  const [zoom, setZoom] = useState(9);
  // this is where all of our map logic is going to live
  // adding the empty dependency array ensures that the map
  // is only rendered once
  useEffect(() => {
    // create the map and configure it
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-103.5917, 40.6699],
      zoom: 4,
      minZoom: 1,
      maxZoom: 10
    })

    // only want to work with the map after it has fully loaded
    // if you try to add sources and layers before the map has loaded
    // things will not work properly
    map.on("load", () => {
      // add mapbox terrain dem source for 3d terrain rendering
      map.addSource('radiations', {
        type: 'geojson',
        // Point to GeoJSON data. 
        data: geojson, 
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
        clusterProperties: {"sum_radiation": ["+", ["get", "radiation"]]},
      })

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'radiations',
        filter: ['has', 'point_count'],
        paint: {                    
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6',
                100,
                '#f1f075',
                750,
                '#f28cb1'
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                100,
                30,
                750,
                40
            ]
        }
    })
    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'radiations',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',                                     //'{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    })

    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'radiations',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#00A300',
            'circle-radius': 15,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    })
    
    map.addLayer({
        id: 'unclustered-point-text',
        type: 'symbol',
        source: 'radiations',
        filter: ['!', ['has', 'point_count']],
        layout: {
            'text-field': '{radiation}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 10
        }
    })

    // inspect a cluster on click
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;
      map.getSource('radiations').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
              if (err) return;

              map.easeTo({
                  center: features[0].geometry.coordinates,
                  zoom: zoom
              });
          }
      );
  })

  // When a click event occurs on a feature in
  // the unclustered-point layer, open a popup at
  // the location of the feature, with
  // description HTML from its properties.
  map.on('click', 'unclustered-point', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const station_id = e.features[0].properties.station_id;
      const station_radiation = e.features[0].properties.radiation ?? 0;

      // Ensure that if the map is zoomed out such that
      // multiple copies of the feature are visible, the
      // popup appears over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(
              `<h3>&#x2622;</h3>station_id: ${station_id}<br>radiation : ${station_radiation} µSv`
          )
          .addTo(map);
  })

  map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
  })
  map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
  })
// disable map rotation using right click + drag
map.dragRotate.disable()
            
// disable map rotation using touch rotation gesture
map.touchZoomRotate.disableRotation()
map.on('move', () => {
  setLng(map.getCenter().lng.toFixed(4));
  setLat(map.getCenter().lat.toFixed(4));
  setZoom(map.getZoom().toFixed(2));})
     
    })

    // cleanup function to remove map on unmount
    return () => map.remove()
  }, [])

  return ( 
    <div>
      <div className="sidebar">
      Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
    <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} /> 
    </div>)
}

export default App;
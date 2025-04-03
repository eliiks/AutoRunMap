import { startMarkerIcon, finishMarkerIcon } from './customMarkers.js';

/* HTML elements & CSS variables */
const infoMsgDiv = document.getElementById("info-msg");
const style = getComputedStyle(document.body);

/* Map initialization */
const map = L.map('map').setView([46.92292810003886, 2.3510742187500004], 6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

/* Variables */
var pathLine; // Graphic path composed of multiple lines
var pathPoints = []; // All points (lat, lng) on the map 
var startMarker; // The marker placed on the start of the run
var lastMarker; // The last marker that user has placed
var isPathDrawingComplete = false; // Tells if the user has finished to draw the run path
resetPath(); //Set all variables default values

map.on('click', function(e) {
    // User can't draw anymore if the path has been finished
    if(!isPathDrawingComplete) {
        let point = e.latlng; // Point = numeric
        let marker = L.marker(point).addTo(map); // Marker = graphic

        if(pathPoints.length == 0) {
            marker.setIcon(startMarkerIcon);
            startMarker = marker;
            startMarker.on('click', onStartMarkerClick);
        }else{
            if(pathPoints.length > 1) removeLastMarker(lastMarker);
            addLastMarker(marker)
        }
        
        console.log(`Point added: ${point.lat}, ${point.lng}`);

        pathPoints.push([point.lat, point.lng]);
        pathLine.setLatLngs(pathPoints);
    }
})

function resetPath(){
    /* Graphics */
    if(pathLine) map.removeLayer(pathLine);
    if(startMarker) map.removeLayer(startMarker);
    if(lastMarker) map.removeLayer(lastMarker);

    /* Reset variables */
    pathPoints = [];
    isPathDrawingComplete = false;
    pathLine = L.polyline([], { color: style.getPropertyValue("--map-path-color") }).addTo(map);
}

/* If user has click again on the FIRST marker placed, the path drawing is finished */
function onStartMarkerClick(e) {
    if(pathPoints.length > 1){
        removeLastMarker(lastMarker); // Must remove the last marker..
        lastMarker = startMarker;
        
        pathPoints.push(pathPoints[0]); 
        pathLine.setLatLngs(pathPoints); // .. and create the line between the last point and the start point
        
        isPathDrawingComplete = true;
    }
}

/* If user has click again on the LAST marker placed, the path drawing is finished */
function onLastMarkerClick(e) {
    if(pathPoints.length > 1){
        isPathDrawingComplete = true;
    }
}

function addLastMarker(marker) {
    if(marker){
        lastMarker = marker;
        lastMarker.setIcon(finishMarkerIcon);
        lastMarker.on('click', onLastMarkerClick);
    }
}

function removeLastMarker(marker) {
    if (marker) {
        map.removeLayer(marker);
        marker.removeEventListener('click', onLastMarkerClick);
    }
}

/* Returns a GeoJSON file format describing the path */
function getGeoJSON(){
    let lg;
    
    if(lastMarker === startMarker) lg = L.layerGroup([startMarker]).addLayer(pathLine)
    else lg = L.layerGroup([startMarker, lastMarker]).addLayer(pathLine)
    
    return JSON.stringify(lg.toGeoJSON());
}

/* Draw a path described by the given GeoJSON file on the map*/
function setGeoJSON(geojson){
    resetPath();

    pathLine = L.geoJSON(geojson, {
        // pointToLayer function defines the style for each marker present in GeoJSON file
        pointToLayer: function(feature, latlng) {
            const features = geojson.features;
            const index = features.indexOf(feature);
        
            let icon = startMarkerIcon; // Default marker style
            if(features.length > 1){ // If only marker is present => start marker
                if (index === 0) icon = startMarkerIcon;
                else if (index === features.length - 1) icon = finishMarkerIcon;
            }
            return L.marker(latlng, { icon: icon });
        },
        style: { color: style.getPropertyValue("--map-path-color") }
    }).addTo(map);

    // Fit map to the loaded GeoJSON
    map.fitBounds(pathLine.getBounds());
    isPathDrawingComplete = true;
}

/* Import GeoJSON file button event */
document.getElementById('fileInput').addEventListener('change', function() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a GeoJSON file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const geojson = JSON.parse(event.target.result);
            setGeoJSON(geojson); 
        } catch (error) {
            alert("Invalid GeoJSON file.");
            console.error(error);
        }
    }

    reader.readAsText(file);
});

/* Export GeoJSON file button event */
document.getElementById('GeoJSONExportButton').addEventListener('click', function() {
    // To export a file, map must have at least one line (=two points)
    if(pathPoints.length > 1) {
        const geojson = getGeoJSON();

        const blob = new Blob([geojson]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'run_path.geojson';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }else{
        infoMsgDiv.style.display = "block";
        setTimeout(() => infoMsgDiv.style.display = "none", 3000);
    }
});

/* Clear lines button event */
document.getElementById("ClearPath").addEventListener("click", function(){
    resetPath();
})
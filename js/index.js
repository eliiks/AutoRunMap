import { startMarkerIcon, finishMarkerIcon } from './customMarkers.js';
import { INFO_MSG, ERROR_EXPORT_MSG } from "./customMessages.js";

/* Variables */
var pathLine; // Graphic path composed of multiple lines
var pathPoints = []; // All points (lat, lng) on the map 
var startMarker; // The marker placed on the start of the run
var lastMarker; // The last marker that user has placed
var isPathDrawingComplete = false; // Tells if the user has finished to draw the run path

/* HTML elements & CSS variables */
const infoMsgDiv = document.getElementById("info-msg");
const style = getComputedStyle(document.body);

/* Map initialization */
const map = L.map('map').setView([48.637329308391976, -1.904808282852173], 18);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const pathFindingTool = L.Routing.control({
    waypoints: pathPoints,
    show: false,
    waypointMode: 'snap',
    lineOptions:{
        addWaypoints: false,
        styles: [{color: style.getPropertyValue("--map-path-color"), opacity: 1, weight: 3}]
    },
    createMarker: function() {}
}).addTo(map);

resetPath(); //Set all variables default values

map.on('click', function(e) {
    // User can't draw anymore if the path has been finished
    if(!isPathDrawingComplete) {
        let point = e.latlng; // Point = numeric
        let marker = L.marker(point).addTo(map); // Marker = graphic
        pathPoints.push([point.lat, point.lng]);
        
        if(pathPoints.length == 1) {
            marker.setIcon(startMarkerIcon);
            startMarker = marker;
            startMarker.on('click', onStartMarkerClick);
        }else if(pathPoints.length > 1) {
            displayMsg(INFO_MSG);
            removeLastMarker(lastMarker);
            addLastMarker(marker)
            updatePath();
        }
        
        // Original drawing
        console.log(`Point added: ${point.lat}, ${point.lng}`);
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
    updatePath();
}

function updatePath(){
    pathFindingTool.setWaypoints(pathPoints);
}

function displayMsg(msg, delay = 0){ 
    infoMsgDiv.innerHTML = msg;
    infoMsgDiv.style.display = "block";
    if(delay > 0) setTimeout(() => hideInfoMsg(), delay);
}
function hideInfoMsg(){ infoMsgDiv.style.display = "none"; }

/* If user has click again on the FIRST marker placed, the path drawing is finished */
function onStartMarkerClick(e) {
    if(!isPathDrawingComplete && pathPoints.length > 1){
        removeLastMarker(lastMarker); // Must remove the last marker..
        lastMarker = startMarker;
        
        pathPoints.push(pathPoints[0]); 
        updatePath();
        
        isPathDrawingComplete = true;
        hideInfoMsg();
    }
}

/* If user has click again on the LAST marker placed, the path drawing is finished */
function onLastMarkerClick(e) {
    if(!isPathDrawingComplete && pathPoints.length > 1){
        isPathDrawingComplete = true;
        hideInfoMsg();
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
    hideInfoMsg();
    updatePath();
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
        displayMsg(ERROR_EXPORT_MSG, 5000);
    }
});

/* Clear lines button event */
document.getElementById("ClearPath").addEventListener("click", function(){
    resetPath();
})
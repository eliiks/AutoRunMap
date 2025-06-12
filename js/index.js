import { startMarkerIcon, finishMarkerIcon } from './customMarkers.js';
import { INFO_MSG, ERROR_EXPORT_MSG } from "./customMessages.js";

/* Variables */
var routeWaypoints = []; // All points (lat, lng) on the map 
var distance; // Distance of the route in meters
var startMarker; // The marker placed on the start of the run
var lastMarker; // The last marker that user has placed
var isRouteDrawingComplete = false; // Tells if the user has finished to draw the run path

/* HTML elements & CSS variables */
const infoContainer = document.getElementById("info-container");
const infoDistanceDiv = document.getElementById("info-distance");
const infoMsgDiv = document.getElementById("info-msg");
const style = getComputedStyle(document.body);

/* Map initialization */
const map = L.map('map').setView([48.637329308391976, -1.904808282852173], 18);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://openstreetmap.org/fixthemap">Fix map</a>'
}).addTo(map);

const routingTool = L.Routing.control({
    router: L.Routing.osrmv1({ serviceUrl : "https://routing.openstreetmap.de/routed-foot/route/v1" }),
    waypoints: routeWaypoints,
    show: false,
    waypointMode: 'snap',
    lineOptions:{
        addWaypoints: false, // Disable changing the path by dragging the markers
        styles: [{color: style.getPropertyValue("--map-path-color"), opacity: 1, weight: 3}]
    },
    createMarker: function() {} // Remove the default marker
}).addTo(map);

resetRoute(); //Set all variables default values

function resetRoute(){
    /* Graphics */
    if(startMarker) map.removeLayer(startMarker);
    if(lastMarker) map.removeLayer(lastMarker);

    /* Reset variables */
    routeWaypoints = [];
    isRouteDrawingComplete = false;
    updateRoute();
    hideInfoDiv(infoDistanceDiv);
    hideInfoDiv(infoMsgDiv);
}

function updateRoute(){
    routingTool.setWaypoints(routeWaypoints);
}

function displayInfoDiv(div, msg, delay = 0){
    infoContainer.style.display = "block";
    div.style.display = "block";
    div.innerHTML = msg;
    if(delay > 0) setTimeout(() => hideInfoDiv(div), delay);
}
function displayDistance(distance){
    let distanceToDisplay = distance < 1000 ? distance.toFixed(2) + "m" : (distance/1000).toFixed(2) + "km"; // In meter if < 1000, otherwise in km
    displayInfoDiv(infoDistanceDiv, "Distance : " + distanceToDisplay);
}
function hideInfoDiv(div){ div.style.display = "none"; }

/* Maps mouse click event */
map.on('click', async function(e) {
    // User can't draw anymore if the path has been finished
    if(!isRouteDrawingComplete) {
        // Coordinates
        let worldCoordinates = await getWorldCoordinatesFromMousePosition(e);
        routeWaypoints.push(worldCoordinates);
        
        // Marker
        let marker = L.marker([worldCoordinates[0], worldCoordinates[1]]).addTo(map); 
        
        if(routeWaypoints.length == 1) {
            marker.setIcon(startMarkerIcon);
            startMarker = marker;
            startMarker.on('click', onStartMarkerClick);
        }else if(routeWaypoints.length > 1) {
            displayInfoDiv(infoMsgDiv, INFO_MSG);
            updateLastMarker(marker);
            updateRoute();
        }
        
        // Original drawing
        console.log(`Point added: ${worldCoordinates[0]}, ${worldCoordinates[1]}, ${worldCoordinates[2]}`);
    }
})

async function getWorldCoordinatesFromMousePosition(mouseEvent){
    let latLng = mouseEvent.latlng; // Get the coordinates [Lat, Lng] of the mouse click

    // Request OpenRouteService API to get the elevation of the point clicked
    try{
        let response = await fetch("https://api.openrouteservice.org/elevation/point?api_key=5b3ce3597851110001cf6248b822e43a80e84216bd3e78fa20fb8ce3", {
        "method": "POST",
        "headers":{
            "Content-Type": "application/json; charset=utf-8",
        },
        "body": JSON.stringify({
            "format_in":"point",
            "geometry": [latLng.lng, latLng.lat],
        })
        });

        let json = await response.json();
        return [latLng.lat, latLng.lng, json.geometry.coordinates[2]]; // Lat, Lng, Alt
    }catch(error){
        console.error("Error fetching elevation data:", error);
    }
}

/* If user has click again on the FIRST marker placed, the path drawing is finished */
function onStartMarkerClick(e) {
    if(!isRouteDrawingComplete && routeWaypoints.length > 1){
        removeLastMarker(lastMarker); // Must remove the last marker..
        lastMarker = startMarker;
        
        routeWaypoints.push(routeWaypoints[0]); 
        updateRoute();
        
        isRouteDrawingComplete = true;
        hideInfoDiv(infoMsgDiv);
    }
}

/* If user has click again on the LAST marker placed, the path drawing is finished */
function onLastMarkerClick(e) {
    if(!isRouteDrawingComplete && routeWaypoints.length > 1){
        isRouteDrawingComplete = true;
        hideInfoDiv(infoMsgDiv);
    }
}

function updateLastMarker(newMarker){
    if(newMarker){
        // Remove old last marker
        removeLastMarker(lastMarker);

        // Add new last marker
        lastMarker = newMarker;
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

/* EXPORT GeoJSON FILE */
document.getElementById('GeoJSONExportButton').addEventListener('click', function() {
    // To export a file, map must have at least one line (=two points)
    if(routeWaypoints.length > 1) {
        const geojson = JSON.stringify(getGeoJSON());
        const blob = new Blob([geojson]);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'run_path_v2.geojson';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }else{
        displayInfoDiv(infoMsgDiv, ERROR_EXPORT_MSG, 5000);
    }
});

/* Returns a GeoJSON file format describing the path */
function getGeoJSON(){
    let obj = {
        type: "FeatureCollection",
        features: []
    };

    let startMarkerFeature = {
        "type": "Feature",
        "properties": { "name": "StartMarker" },
        "geometry": {
            "type": "Point",
            "coordinates": startMarker.getLatLng()
        }
    }

    let routeFeature = {
        "type": "Feature",
        "properties": {
            "name": "Route",
            "distance" : distance
        },
        "geometry" : {
            "type": "LineString",
            "coordinates": routeWaypoints
        }
    }

    if(startMarker === lastMarker){ 
        obj.features.push(startMarkerFeature, routeFeature); 
    }else{
        let lastMarkerFeature = { 
            "type": "Feature",
            "properties": { "name": "LastMarker" },
            "geometry": {
                "type": "Point",
                "coordinates": lastMarker.getLatLng()
            }
        }
        obj.features.push(startMarkerFeature, lastMarkerFeature, routeFeature); 
    }

    return obj;
}

/* IMPORT GeoJSON file button event */
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

/* Draw the route described by the given GeoJSON file on the map */
function setGeoJSON(data){
    resetRoute();
    data.features.forEach(function(feature) {
        let type = feature.geometry.type;
        let name = feature.properties.name;
        
        if(type === "LineString" && name === "Route"){
            distance = feature.properties.distance;
            routeWaypoints = feature.geometry.coordinates;
        }else if(type == "Point"){
            if(name == "StartMarker"){
                startMarker = L.marker(feature.geometry.coordinates).addTo(map);
                startMarker.setIcon(startMarkerIcon);
            }else if(name == "LastMarker"){
                lastMarker = L.marker(feature.geometry.coordinates).addTo(map);
                lastMarker.setIcon(finishMarkerIcon);
            }
        }
    });

    // Update info divs and map
    isRouteDrawingComplete = true;
    hideInfoDiv(infoMsgDiv);
    displayDistance(distance);
    updateRoute();
}

/* Clear lines button event */
document.getElementById("ClearPath").addEventListener("click", function(){
    resetRoute();
})

/* Events on routing tool when a route has been founded */
routingTool.on('routesfound', function(e) {
    // Save route and distance
    distance = e.routes[0].summary.totalDistance;
    displayDistance(distance); // Display distance in the info div
});
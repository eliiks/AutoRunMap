# AutoRunMap
AutoRunMap is a mapping application for the AutoRun project, allowing users to draw and export running routes in GeoJSON format.\
**This application is currently under development and subject to future changes.**

## How to Access the Map
You can test the application here : https://eliiks.github.io/AutoRunMap/ \
To use the map locally, first launch the server with the following command :
```
node app.js
````
Then, open your favorite web browser and enter http://localhost:3000/ in the address bar.

## How to Draw on the Map
Zoom in and out using the mouse scroll wheel or the "+" and "-" buttons in the top-left corner.\
To create a path, click at least twice on the desired locations on the map. Continue extending the path by clicking on additional points.\
To finish the path, you have two options :
+ Click again on the last marker you placed.
+ Click on the first (green) marker to create a loop.
  
To erase the current drawing, click the "Clear Path" button at the bottom.

## How to Import/Export GeoJSON
After placing at least two markers, you can export the path as a GeoJSON file by clicking "Export GeoJSON" and saving the file.\
To import a GeoJSON file and display a saved path, click "Import GeoJSON" and select a file.\
⚠️ Importing a file will erase the current drawing on the map.⚠️

## Credits
Web integration : me [Eliiks](https://eliiks.github.io/) \
Visual design : [Braun](https://camillebraun.github.io/) \
Original concept : [Pulkio](https://pulkio.github.io/PortfolioData/html/accueil.html)

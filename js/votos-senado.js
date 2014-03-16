var widthmap = parseFloat(d3.select("#mapa-municipios").style("width")),
    heightmap = widthmap,
    widthbarplot = parseFloat(d3.select("#bar-plot").style("width")),
    heightbarplot = 200 + 30;

var map = d3.select("#mapa-municipios")
    .append("svg")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 700 900")
    .attr("width", widthmap)
    .attr("height", heightmap);

d3.json("mpio/municipios.col.json", function(error, colombia) {

municipios = topojson.feature(colombia, colombia.objects.mpio);

    var projection = d3.geo.mercator()
        .scale(2100)
        .translate([widthmap / 2, heightmap / 2])
        .center([-59,40])
        .rotate([12,3,9]);

    var path = d3.geo.path()
        .projection(projection);

    map.append("path")
        .datum(municipios)
        .attr("d", path)
        .attr("class", "colombia-borde");

    map.selectAll(".mpio")
        .data(municipios.features)
        .enter().append("path")
        .attr("class", function(d) { return "mpio " + "muni" + d.id;})
        .attr("d", path);

    console.log(municipios.features);

    map.append("path")
        .datum(topojson.mesh(colombia, colombia.objects.mpio,
            function(a, b) { return a !== b; }))
        .attr("d", path)
        .attr("class", "mpio-borde");

    map.append("path")
        .datum(topojson.mesh(colombia, colombia.objects.depto,
            function(a, b) { return a !== b; }))
        .attr("d", path)
        .attr("class", "depto-borde");
});

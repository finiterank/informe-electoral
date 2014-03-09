
var widthmapa = parseFloat(d3.select("#mapa-div").style("width")),
    heightmapa = widthmapa,
    widthbarplot = parseFloat(d3.select("#bar-plot-div").style("width")),
    heightbarplot = 200 + 30;

var mapa = d3.select("#mapa-div").append("svg")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 900 900")
    .attr("width", widthmapa)
    .attr("height", heightmapa);

var barplot = d3.select("#bar-plot-div").append("svg")
    .attr("width", widthbarplot)
    .attr("height", heightbarplot);

var cajapartidos = d3.select("#partidos-div").append("svg")
    .attr("width", widthbarplot)
    .attr("height", heightbarplot);


/*
ogr2ogr -f GeoJSON depto.json depto.shp -s_srs EPSG:26986 -t_srs EPSG:4326
topojson --id-property +DPTO -p cod=DPTO -p +cod -p name=NOMBRE_DPT -p name -o mapa-departamentos.json depto.json
 */


d3.json("depto/mapa-departamentos.json", function(error, colombia) {
    d3.csv("datos/votaciones2010.csv", function(error, data) {

        data.forEach(function(senador) {
           senador.votacion = +senador.votacion;
           senador.votosdepto1 = +senador.votosdepto1;
           senador.votosdepto2 = +senador.votosdepto2;
           senador.votosdepto3 = +senador.votosdepto3;
           senador.porcdepto1 = +senador.porcdepto1;
           senador.porcdepto2 = +senador.porcdepto2;
           senador.porcdepto3 = +senador.porcdepto3;
           senador.departamentos = [senador.depto1rel, senador.depto2rel, senador.depto3rel];
           senador.nombre = senador.nombres + " " + senador.apellido1 + " " + senador.apellido2;
        });

        console.log(data)

        // Datos organizados por partido

        var partidos = d3.nest()
            .key(function(d) { return d.partido; })
            .entries(data);

        partidos = partidos.sort(function(a,b){
          return - a.values.length + b.values.length;
        });

        partidos.forEach(function(partido){
          partido.votos = acumulados(partido.values)[0];
          partido.depts = acumulados(partido.values)[1];
        });

        function acumulados(partido){
          var suma = 0;
          var depts = [];
          for (var i=0; i < partido.length; i++){
            suma += partido[i].votacion;
            depts = depts.concat(partido[i].departamentos);
          }
          return [suma, d3.set(depts)];
        }

        console.log(partidos, partidos.length);

        // Diagrama de Barras

        var color = d3.scale.category10()
            .domain(partidos.map(function(d){
              return d.key;
            }));

        var xScaleBarPlot = d3.scale.ordinal()
            .domain(d3.range(partidos.length))
            .rangeRoundBands([0, widthbarplot], 0.05);

        var yScaleBarPlot = d3.scale.linear()
            .domain([0, d3.max(partidos.map(function(d){
              return d.values.length;
            }))])
            .range([0, heightbarplot - 30]);

        var barras = barplot.selectAll("rect")
            .data(partidos)
            .enter()
            .append("rect")
            .attr("class", "barrita")
            .attr("x", function(d, i){return xScaleBarPlot(i);})
            .attr("y", function(d){
              return heightbarplot - yScaleBarPlot(d.values.length);
            })
            .attr("width", xScaleBarPlot.rangeBand())
            .attr("height", function(d){
              return yScaleBarPlot(d.values.length);
            })
            .attr("fill", function(d){return color(d.key);})
            .on("click", colorDepts);


        var labels = barplot.selectAll("text.lab-barras")
            .data(partidos)
            .enter().append("text")
            .attr("class", "lab-barras")
            .text(function(d){return d.values.length;})
            .attr("x", function(d, i){return xScaleBarPlot(i) + xScaleBarPlot.rangeBand() / 2 ; })
            .attr("text-anchor", "middle")
            .attr("y", function(d) { return heightbarplot - yScaleBarPlot(d.values.length) - 5; })
            .attr("font-size", "10px")
            .attr("fill", "#ccc");

        // Código de colores

        var legend = cajapartidos.selectAll(".legend")
            .data(partidos)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { return "translate(0," + (30 + (i * 17)) + ")"; });

        var cuadritos = legend.append("rect")
          .attr("x", 15)
          .attr("width", 15)
          .attr("height", 15)
          .style("fill", function(d){ return color(d.key);});

        var leyendas = legend.append("text")
          .attr("x", 35)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "start")
          //.text(function(d) { return d.key + " (" + d.votos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " votos)"; })
          .text(function(d) { return d.key; })
          .attr("font-size", "12px")
          .attr("fill", "#ccc");

        // Mapa

        var departamentos = topojson.feature(colombia, colombia.objects.depto);

        var projection = d3.geo.mercator()
            .scale(2000)
            .translate([widthmapa / 2, heightmapa / 2])
            .center([-61,43])
            .rotate([12,3,9]);

        var path = d3.geo.path()
            .projection(projection);

        mapa.append("path")
            .datum(departamentos)
            .attr("d", path)
            .attr("class", "colombia-borde");

        console.log(departamentos.features);

        mapa.selectAll(".dpto")
            .data(departamentos.features)
            .enter().append("path")
            .attr("class", function(d) { return "dpto " + "_" + d.properties.name.toUpperCase(); })
            .attr("d", path);

        mapa.append("path")
            .datum(topojson.mesh(colombia, colombia.objects.depto, function(a, b) { return a !== b; }))
            .attr("d", path)
            .attr("class", "depto-borde");

        function colorDepts(partido){
            mapa.selectAll(".dpto")
              .data(departamentos.features)
              .transition()
              .duration(1000)
              .style("fill", function(d){
                if(partido.depts.has(d.properties.name.toUpperCase())){
                return color(partido.key);
                }
                else{
                return "#ccc";
                }
              });
        }

        d3.select(window).on('resize', resize);

        function resize(){
            widthmapa = parseFloat(d3.select("#mapa-div").style("width"));
            heightmapa = widthmapa;
            widthbarplot = parseFloat(d3.select("#bar-plot-div").style("width"));

            xScaleBarPlot = d3.scale.ordinal()
                .domain(d3.range(partidos.length))
                .rangeRoundBands([0, widthbarplot], 0.05);

            barplot.attr("width", widthbarplot);
            cajapartidos.attr("width", widthbarplot);

            barras.attr("x", function(d, i){return xScaleBarPlot(i);})
              .attr("width", xScaleBarPlot.rangeBand());

            labels.attr("x", function(d, i){return xScaleBarPlot(i) + xScaleBarPlot.rangeBand() / 2 ; })

            mapa.attr("width", widthmapa)
              .attr("height", heightmapa);


            projection.translate([widthmapa / 2, heightmapa / 2]);

            path.projection(projection);
        }
   });
});

var xScaleBarPlot,
    yScaleBarPlot,
    barras, labels,
    projection,
    vectorvotosinicial,
    validosinicial;

var widthmap = parseFloat(d3.select("#mapa-municipios").style("width")),
    heightmap = widthmap,
    widthbarplot = parseFloat(d3.select("#bar-plot").style("width")),
    heightbarplot = 150 + 30,
    widthlegend = parseFloat(d3.select("#leyenda").style("width")),
    heightlegend = 200;

var datosMunicipioId = d3.map();

var map = d3.select("#mapa-municipios")
    .append("svg")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("viewBox", "0 0 700 900")
    .attr("width", widthmap)
    .attr("height", heightmap);

var color = {"la.u":"#ff7f0e",
            "centro.democratico":"#7f7f7f",
            "conservador":"#1f77b4",
            "liberal":"#FF0000",
            "cambio.radical":"#A30599",
            "verdes": "#2ca02c",
            "polo":"#ffed00",
            "poc":"#8c564b",
            "mira":"#17becf",
            "Empate": "#000000"};

var legend = d3.select("#leyenda").append("svg")
    .attr("width", widthlegend)
    .attr("height", heightlegend);

var barplot = d3.select("#bar-plot").append("svg")
    .attr("width", widthbarplot)
    .attr("height", heightbarplot);


var info = d3.select("#info").append("div")
            .html("<small>" + "Porcentaje de votos válidos nacionales para cada partido" + "</small>");

var color = {"la.u":"#ff7f0e",
            "centro.democratico":"#7f7f7f",
            "conservador":"#1f77b4",
            "liberal":"#FF0000",
            "cambio.radical":"#A30599",
            "verdes": "#2ca02c",
            "polo":"#ffed00",
            "poc":"#8c564b",
            "mira":"#17becf",
            "Empate": "#000000"};


var datapartidos = [
    {"nombre": "Partido de la Unidad Nacional", "color": color["la.u"], "ganadores": 287},
    {"nombre": "Centro Democrático", "color": color["centro.democratico"], "ganadores": 178},
    {"nombre": "Partido Conservador", "color": color["conservador"], "ganadores": 300},
    {"nombre": "Partido Liberal", "color": color["liberal"], "ganadores": 199},
    {"nombre": "Cambio Radical", "color": color["cambio.radical"], "ganadores": 49},
    {"nombre": "Alianza Verde", "color": color["verdes"], "ganadores": 21},
    {"nombre": "Polo Democrático Alternativo", "color": color["polo"], "ganadores": 7},
    {"nombre": "Partido Opción Ciudadana", "color": color["poc"], "ganadores": 77},
    {"nombre": "MIRA", "color": color["mira"], "ganadores": 13},
];

var colorespartidos = datapartidos.map(function(d){
    return d["color"];
});


queue()
    .defer(d3.json, "mpio/municipios.col.json")
    .defer(d3.csv, "datos/votosmpio.csv", fillDatosMunicipios)
    .await(ready);


legendGenerator();

d3.select(window).on('resize', resize);


function ready(error, colombia) {

    vectorvotosinicial = datosMunicipioId.values().map(function(d){
        return d["votos"];
    }).reduce(sumArrays);

    validosinicial = datosMunicipioId.values().map(function(d){
        return d["val"];
    }).reduce(function(a,b){return a+b;});

    barplotInicial();
    municipios = topojson.feature(colombia, colombia.objects.mpio);

    projection = d3.geo.mercator()
        .scale(2100)
        .translate([widthmap / 2, heightmap / 2])
        .center([-55,40])
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
        .attr("class", function(d) {return "mpio " + "muni" + d.id;})
        .style("fill", function(d) {
            var datos = datosMunicipioId.get(d.id)
            if(datos){
                var ganador = datos["gan"];
                return color[ganador];
            }
            else{
                return "#000000";
            }
        })
        .on("mouseover", function(d){
            var h = datosMunicipioId.get(d.id)
            var vectorvotos = h["votos"];
            var validos = h["val"];
            updateBarplot(vectorvotos, validos);
            var mun= h["mun"];
            var dep= h["dep"];
            var blan = 100 * h["bl"] / h["val"];
            var abs = h["abs"];
            var valporc = 100 * h["val"] / validosinicial;
            info.html("<small>" +
            "Porcentaje de votos válidos en "
            + mun +", " + dep + ", para cada partido"
            + "<br>Votos válidos del total nacional: " + valporc.toFixed(2) +"%"
            + "<br>Blancos: " + blan.toFixed(2) + "% "
            + "<br>Abstención: " + abs.toFixed(2) + "%"
            + "</small>");
        })
        .on("mouseout", function(){
            updateBarplot(vectorvotosinicial, validosinicial);
            info.html("<small>" + "Porcentaje de votos válidos nacionales para cada partido" + "</small>");
        })
        .attr("d", path);

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
}

function barplotInicial(){

    var porcinicial = porcentajesVotos(vectorvotosinicial, validosinicial);

    var datosbarplotinicial = d3.zip(porcinicial, colorespartidos);

    console.log(datosbarplotinicial);

    xScaleBarPlot = d3.scale.ordinal()
        .domain(d3.range(datosbarplotinicial.length))
        .rangeRoundBands([0, widthbarplot], 0.05);

    yScaleBarPlot = d3.scale.linear()
        .domain([0, d3.max(datosbarplotinicial.map(function(d){
          return d[0];
        }))])
        .range([0, heightbarplot - 30]);

    barras = barplot.selectAll("rect")
        .data(datosbarplotinicial)
        .enter()
        .append("rect")
        .attr("class", "barrita")
        .attr("x", function(d, i){return xScaleBarPlot(i);})
        .attr("y", function(d){
          return heightbarplot - yScaleBarPlot(d[0]);
        })
        .attr("width", xScaleBarPlot.rangeBand())
        .attr("height", function(d){
          return yScaleBarPlot(d[0]);
        })
        .attr("fill", function(d){return d[1];});

    labels = barplot.selectAll("text.lab-barras")
         .data(datosbarplotinicial)
         .enter().append("text")
         .attr("class", "lab-barras")
         .text(function(d){return d[0].toFixed(2) + "%";})
         .attr("x", function(d, i){return xScaleBarPlot(i) + xScaleBarPlot.rangeBand() / 2 ; })
         .attr("text-anchor", "middle")
         .attr("y", function(d) { return heightbarplot - yScaleBarPlot(d[0]) - 5; })
         .attr("font-size", "10px")
         .attr("fill", "#ccc");
}

function sumArrays(a,b){
    var output = a;
    for(i = 0 ; i < a.length; i++){
        output[i] += b[i];
    }
    return output;
}

function fillDatosMunicipios(d){
    d.abs = +d.abs;
    d.bl = +d.bl;
    d.cd = +d.cd;
    d.cr = +d.cr;
    d.dane = +d.dane;
    d.lu = +d.lu;
    d.pv = +d.pv;
    d.mi = +d.mi;
    d.nul = +d.nul;
    d.pc = +d.pc;
    d.pd = +d.pd;
    d.pl = +d.pl;
    d.po = +d.po;
    d.pot = +d.pot;
    d.sen = +d.sen;
    d.senind = +d.senind;
    d.sinmarca = +d.sinmarca;
    d.tot = +d.tot;
    d.totconb = +d.totconb;
    d.val = +d.val;
    d.votos = [d.lu, d.cd, d.pc, d.pl, d.cr, d.pv, d.pd, d.po, d.mi];
    datosMunicipioId.set(d.dane, d);
}

function legendGenerator(){
    var leg = legend.selectAll(".legend")
        .data(datapartidos)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + (30 + (i * 17)) + ")"; });

    var cuadritos = leg.append("rect")
      .attr("x", 15)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", function(d){ return d["color"];});

    var leyendas = leg.append("text")
      .attr("x", 35)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text(function(d) { return d["nombre"] + " (" + d["ganadores"] + " mun.)";})
      .attr("font-size", "12px")
      .attr("fill", "#ccc");
}

function porcentajesVotos(vector, validos){
    return vector.map(function(d){
        return 100 * d / validos;
    });
}

function updateBarplot(vectorvotos, validos){
    var porc = porcentajesVotos(vectorvotos, validos);
    var datos = d3.zip(porc, colorespartidos);
    yScaleBarPlot.domain([0, d3.max(datos.map(function(d){
          return d[0];
      }))]);

    barras.data(datos)
        .transition()
        .duration(1000)
        .attr("y", function(d){
          return heightbarplot - yScaleBarPlot(d[0]);
        })
        .attr("height", function(d){
          return yScaleBarPlot(d[0]);
        });
    labels.data(datos)
        .transition()
        .duration(1000)
        .text(function(d){return d[0].toFixed(2) + "%";})
        .attr("y", function(d) { return heightbarplot - yScaleBarPlot(d[0]) - 5; });
}

function resize(){
    widthmap = parseFloat(d3.select("#mapa-municipios").style("width"));
    heightmap = widthmap;
    widthbarplot = parseFloat(d3.select("#bar-plot").style("width"));

    xScaleBarPlot.rangeRoundBands([0, widthbarplot], 0.05);

    barplot.attr("width", widthbarplot);

    barras.attr("x", function(d, i){return xScaleBarPlot(i);})
      .attr("width", xScaleBarPlot.rangeBand());

    labels.attr("x", function(d, i){return xScaleBarPlot(i) + xScaleBarPlot.rangeBand() / 2 ; })

    map.attr("width", widthmap)
      .attr("height", heightmap);

    projection.translate([widthmap / 2, heightmap / 2]);

    path.projection(projection);
}

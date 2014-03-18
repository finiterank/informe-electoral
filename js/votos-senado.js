var xScaleBarPlot,
    yScaleBarPlot,
    barras, labels,
    projection,
    vectorvotosinicial,
    validosinicial, path;

var widthmap = parseFloat(d3.select("#mapa-municipios").style("width")),
    heightmap = widthmap,
    widthbarplot = parseFloat(d3.select("#bar-plot").style("width")),
    heightbarplot = 150 + 30,
    widthlegend = parseFloat(d3.select("#leyenda").style("width")),
    heightlegend = 200;

var datosMunicipioId = d3.map(),
    datosCandidatoNombre = d3.map();

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
            .html("<small>" + "Porcentaje de votos válidos nacionales para cada partido." + "</small>");

var selector = d3.select("#selector").append("select")
                .attr("class", "form-control")
                .attr("id", "candidatos");

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

var posicionpartidos = {"la.u": 0,
            "centro.democratico": 1,
            "conservador":2,
            "liberal": 3,
            "cambio.radical": 4,
            "verdes": 5,
            "polo": 6,
            "poc": 7,
            "mira":8};

var cortopartidos = {"la.u": "La U",
            "centro.democratico": "C. Dem.",
            "conservador": "Cons.",
            "liberal": "Lib.",
            "cambio.radical": "C. Rad.",
            "verdes": "Verd.",
            "polo": "PDA",
            "poc": "POC",
            "mira": "Mira"};

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
    .defer(d3.csv, "datos/candidatosvotompio.csv", fillDatosCandidatos)
    .await(ready);


legendGenerator();

d3.select(window).on('resize', resize);
d3.select("#candidatos").on('change', change);

function ready(error, colombia) {
    vectorvotosinicial = datosMunicipioId.values().map(function(d){
        return d["votos"];
    }).reduce(sumArrays);

    validosinicial = datosMunicipioId.values().map(function(d){
        return d["val"];
    }).reduce(function(a,b){return a+b;});


    generateSelectorCandidatos();
    barplotInicial();
    municipios = topojson.feature(colombia, colombia.objects.mpio);

    projection = d3.geo.mercator()
        .scale(2100)
        .translate([widthmap / 2, heightmap / 2])
        .center([-55,40])
        .rotate([12,3,9]);

    path = d3.geo.path()
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

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function generateSelectorCandidatos(){
    var candidatos = datosCandidatoNombre.keys().sort(d3.ascending).map(toTitleCase);
    var removed = candidatos.splice(464,9);
    var ord = removed.concat(candidatos);
    var ordenados = ["Distribución nacional"].concat(ord)
    var opcionesimpresas = imprimirOpciones(ordenados);
    selector.html(opcionesimpresas);
}

function imprimirOpciones(opciones){
	var output = '<option value="' + "DISTRIBUCIÓN NACIONAL" + '">' + opciones[0] + '</option>';
	for(var i=1; i < opciones.length; i++){
        var v = opciones[i].toUpperCase();
        var p = datosCandidatoNombre.get(v)["par"];
		output = output + '<option value="' + v + '">' + opciones[i] + " ("+ cortopartidos[p] + ")"+ '</option>';
	}
	return output;
}

function barplotInicial(){

    var porcinicial = porcentajesVotos(vectorvotosinicial, validosinicial);

    var datosbarplotinicial = d3.zip(porcinicial, colorespartidos);

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



function fillDatosCandidatos(d){
    var values=new Array();
    d["tot"] = +d["tot"];
    d["cur"] = +d["cur"];
    for(var key in d){
        var sufijo = key.substr(0,3);
        if(sufijo == "mun"){
            d[key] = +d[key];
            values.push(d[key]);
        }
    }
    d["values"] = values;
    datosCandidatoNombre.set(d.nom, d);
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

function colorearMapaCandidato(datos){

    var total = datos["tot"];
    var totalpartido = vectorvotosinicial[posicionpartidos[datos["par"]]];
    var porcentaje = 100 * total / totalpartido;
    if(datos["cur"] == 1){
        var senadorono = " Será senador en el nuevo período."
    }
    else{
        var senadorono = "";
    }
    updateBarplot(vectorvotosinicial, validosinicial);
    info.html("<small>Porcentaje de votos válidos nacionales para cada partido."
      + "<br>" + toTitleCase(datos["nom"]) + " logró " + votosPalabra(datos["tot"]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      + " a nivel nacional; un " + porcentaje.toFixed(2) + "% del total de su partido." + senadorono + "</small>");
    var dominioopacidad = datos["values"].filter(function(d){
        return d != 0
    });
    var baserango = 0.3;
    var rangoopacidad = d3.range(5).map(function(d){
        var step = (1 - baserango) / 4;
        return baserango + (d * step);
    });
    var opacityScale = d3.scale.quantile()
        .domain(dominioopacidad)
        .range(rangoopacidad);

    map.selectAll(".mpio")
        .data(municipios.features)
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
            var votoscand = datos["mun" + d.id];
            var porccandmun = 100 * votoscand / h["val"];
            var totalpartidomun = vectorvotos[posicionpartidos[datos["par"]]];
            var porccandpartmun = 100 * votoscand / totalpartidomun;
            info.html("<small>" +
            "Porcentaje de votos válidos en "
            + mun +", " + dep + ", para cada partido."
            + "<br>" + toTitleCase(datos["nom"]) + " logró " + votosPalabra(votoscand).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " aquí;"
            + " un " + porccandmun.toFixed(2) + "% del total de válidos municipales (y "
            + porccandpartmun.toFixed(2) + "% del total de válidos municipales para su partido.)"
            + "</small>");
        })
        .on("mouseout", function(){
            updateBarplot(vectorvotosinicial, validosinicial);
            info.html("<small>Porcentaje de votos válidos nacionales para cada partido."
             + "<br>" + toTitleCase(datos["nom"]) + " logró " + votosPalabra(datos["tot"]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
             + " a nivel nacional; un " + porcentaje.toFixed(2) + "% del total de su partido." + senadorono +"</small>");
        })
        .transition()
        .duration(1000)
        .style("fill", color[datos.par])
        .style("fill-opacity", function(d){
            var identificacion = "mun" + d.id;
            var votosmunicipio = datos[identificacion];
            if(votosmunicipio == undefined){return 0;}
            if(votosmunicipio != 0){
                return opacityScale(votosmunicipio);
            }
            else{return 0;}
        });
}

function votosPalabra(n){
    if(n == 1){
        return n + " voto";
    }
    else{
        return n +" votos";
    }
}
function colorearMapaInicial(){
    info.html("<small>Porcentaje de votos válidos nacionales para cada partido.</small>");
    map.selectAll(".mpio")
        .data(municipios.features)
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
            + mun +", " + dep + ", para cada partido."
            + "<br>Votos válidos del total nacional: " + valporc.toFixed(2) +"%"
            + "<br>Blancos: " + blan.toFixed(2) + "% "
            + "<br>Abstención: " + abs.toFixed(2) + "%"
            + "</small>");
        })
        .on("mouseout", function(){
            updateBarplot(vectorvotosinicial, validosinicial);
            info.html("<small>Porcentaje de votos válidos nacionales para cada partido.</small>");
        })
        .transition()
        .duration(1000)
        .style("fill-opacity", 1)
        .style("fill", function(d) {
            var datos = datosMunicipioId.get(d.id)
            if(datos){
                var ganador = datos["gan"];
                return color[ganador];
            }
            else{
                return "#000000";
            }
        });
}

function change(){
    var v = this.value;
    console.log(v);
    if(v == "DISTRIBUCIÓN NACIONAL"){
        colorearMapaInicial();
    }
    else{
        var datos = datosCandidatoNombre.get(v);
        colorearMapaCandidato(datos);
    }
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

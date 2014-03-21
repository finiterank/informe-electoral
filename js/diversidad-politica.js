var width = 600,
    height = 700,
    active = d3.select(null);

var datosMunicipioId = d3.map(),
    indDep = d3.map();

var projection = d3.geo.mercator()
    .scale(1800)
    .translate([width / 2, height / 2])
    .center([-55,37])
    .rotate([12,3,9]);

var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("#mapa").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

var info = d3.select("#datos-indice").append("div")

queue()
    .defer(d3.json, "mpio/municipios.col.json")
    .defer(d3.csv, "datos/votosmpio.csv", fillDatosMunicipios)
    .await(ready);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

var g = svg.append("g");

svg
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.event);


function ready(error, colombia) {

  var dat = datosMunicipioId.values()

  var vectorindices = dat.map(function(d){
      return d["indice"];
  });

  var datdpt = d3.nest()
    .key(function(d) { return d.dep; })
    .entries(dat);

  datdpt.forEach(function(dep){
    dep.votos = dep.values.map(function(d){return d.votos;}).reduce(sumArrays);
    dep.validos = d3.sum(dep.values.map(function(d){return d.val;}));
    dep.indice = indiceHH(dep.votos, dep.validos);
    indDep.set(dep.key, dep.indice);
  });

  var votosnacionales = dat.map(function(d){return d.votos;}).reduce(sumArrays);
  var validosnacionales = d3.sum(dat.map(function(d){return d.val;}));
  var indicenacional = indiceHH(votosnacionales, validosnacionales);

  console.log("Indice Nacional: " + indicenacional);

  d3.select("#indice-nacional").html(indicenacional.toFixed(2));

  var scaleIndices = d3.scale.linear()
      .domain([d3.min(vectorindices.filter(function(d){
          return d != 0;
      })), d3.max(vectorindices)])
      .range([0.1, 1]);

  g.selectAll("path")
      .data(topojson.feature(colombia, colombia.objects.mpio).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", function(d) {return "feature " + "muni" + d.id;})
      .style("fill", "#ff6600")
      .style("fill-opacity", function(d){
          var datos = datosMunicipioId.get(d.id);
          if(datos != undefined){
              if(datos["indice"] != 0){
                  return scaleIndices(datos["indice"]);
              }
              else{return 0;}
          }
          else{return 0;}
      })
      .on("mouseover", function(d){
          var h = datosMunicipioId.get(d.id);
          var mun= h["mun"];
          var dep= h["dep"];
          var ind = h["indice"].toFixed(2);
          var inddepart = indDep.get(dep).toFixed(2);
          var output = "<h4>"+ mun + ", " + dep + "</h4>"
          output += "<p class='indice-mun'>"+ ind +"</p>";
          output += "<p class='indice-dep'>Índice departamental: "+ inddepart + "</p>";
          info.html(output);
      })
      .on("mouseout", function(){
          info.html("");
      })
      .on("click", clicked);

  g.append("path")
      .datum(topojson.mesh(colombia, colombia.objects.mpio, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", path);

  g.append("path")
      .datum(topojson.mesh(colombia, colombia.objects.depto,
          function(a, b) { return a !== b; }))
      .attr("class", "submesh")
      .attr("d", path);
}

function clicked(d) {
  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .2 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(750)
      .call(zoom.translate(translate).scale(scale).event);
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      .call(zoom.translate([0, 0]).scale(1).event);
}

function zoomed() {
  g.style("stroke-width", 0.5 / d3.event.scale + "px");
  g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  d3.selectAll(".submesh").style("stroke-width", 1.2 / d3.event.scale + "px");
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
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
d.votos = [d.lu, d.cd, d.pc, d.pl, d.cr, d.pv, d.pd, d.po, d.mi, d.bl];
d.indice = indiceHH(d.votos, d.val);
datosMunicipioId.set(d.dane, d);
}

function indiceHH(votos, validos){
    var votosrel = votos.map(function(x){return x/validos;});
    var numerador = d3.sum(votosrel) * d3.sum(votosrel);
    var denominador = d3.sum(votosrel.map(function(x){return x * x;}));
    if(denominador != 0){return numerador/denominador;}
    else{return 0;}
}

function sumArrays(a,b){
    var output = a;
    for(i = 0 ; i < a.length; i++){
        output[i] += b[i];
    }
    return output;
}

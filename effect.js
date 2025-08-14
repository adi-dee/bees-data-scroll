// effect.js - replace the whole file with this

// Configuration
const svgWidth = 900;
const svgHeight = 550;
const margin = { top: 20, right: 100, bottom: 40, left: 60 };

// SVG container
const svg = d3.select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("width", "100%")
  .style("height", "auto");

const xAxisGroup = svg.append("g")
  .attr("transform", `translate(0, ${svgHeight - margin.bottom})`)
  .attr("class", "x-axis");

const yAxisGroup = svg.append("g")
  .attr("transform", `translate(${margin.left}, 0)`)
  .attr("class", "y-axis");

const tooltip = d3.select("#tooltip");
const infoBox = d3.select("#selected-info");

const importantSeeds = new Set([
  "18176","27297","30893","13161","27675","11586","27729","21191","22889","43269",
  "26845","2691","40625","17720","41783","16131","36350","33249","24963","5850",
  "1856","20093","23949","1439","17878","19574","13940","30155","32162","8631",
  "2460","17119","30066","9699","23125","32397","13892","4087","25574","40371","18961"
]);

// Load and render data
d3.csv("assets/df_for_adi.csv", d3.autoType).then(data => {

  // pre-calc averages
  data.forEach(d => {
    d.avg_V1_V2 = (d.V1 + d.V2) / 2;
    d.avg_V1_V3 = (d.V1 + d.V3) / 2;
    d.avg_V2_V3 = (d.V2 + d.V3) / 2;
    d.avg_V1_V2_V3 = (d.V1 + d.V2 + d.V3) / 3;
  });

  let currentX = document.getElementById("x-select").value;
  let currentColorVar = document.getElementById("color-select").value;

  // color interpolators for non-compromise choices
  const interpolators = {
    extra_profit: d3.interpolateOranges,
    area_mean: d3.interpolatePurples,
    edge_out: d3.interpolateGreens,
    grassland_cover: d3.interpolateYlGn,
    forest_cover: d3.interpolateBuPu
  };

  // main render function
  function renderChart(xVar) {
    const yVar = "total_gros_margin";

    // scales
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d[xVar])).nice()
      .range([margin.left, svgWidth - margin.right]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yVar])).nice()
      .range([svgHeight - margin.bottom, margin.top]);

    // center / distance function for "compromise" coloring
    const middleX = d3.mean(x.domain());
    const middleY = d3.mean(y.domain());
    const distance = d => Math.sqrt(Math.pow(x(d[xVar]) - x(middleX), 2) + Math.pow(y(d[yVar]) - y(middleY), 2));

    // choose color scale
    let color;
    if (currentColorVar === "compromise") {
      const distances = data.map(distance);
      const minDist = d3.min(distances);
      const maxDist = d3.max(distances);
      color = d3.scaleDiverging(d3.interpolateRgbBasis([
        "#ffb0ed", "#ffffff", "#ffdd52", "#ff633a"
      ]))
      // diverging domain: [max, mid, min] keeps white center
      .domain([maxDist, (maxDist + minDist) / 2, minDist]);
    } else {
      let extent = d3.extent(data, d => +d[currentColorVar]);
      // if extent collapsed, expand a bit to avoid identical min==max
      if (extent[0] == null || extent[1] == null) {
        extent = [0, 1];
      } else if (extent[0] === extent[1]) {
        extent = [extent[0] - 1, extent[1] + 1];
      }
      const interp = interpolators[currentColorVar] || d3.interpolateYlGnBu;
      color = d3.scaleSequential(interp).domain(extent).clamp(true);
    }

    // axes
    const xAxis = d3.axisBottom(x).tickSize(-svgHeight + margin.top + margin.bottom);
    const yAxis = d3.axisLeft(y).tickSize(-svgWidth + margin.left + margin.right);
    xAxisGroup.transition().duration(600).call(xAxis);
    yAxisGroup.transition().duration(600).call(yAxis);

    svg.selectAll(".x-axis .tick line, .y-axis .tick line")
      .attr("stroke", "#ccc").attr("stroke-dasharray", "2,2");
    svg.selectAll(".x-axis path, .y-axis path").attr("stroke", "#888");
    svg.selectAll(".x-axis text, .y-axis text").attr("fill", "#666").attr("font-size", "11px");

    // remove old hexagon layer (prevents stacking)
    svg.selectAll(".hexagons").remove();

    // hexbin
    const hexbin = d3.hexbin()
      .x(d => x(d[xVar]))
      .y(d => y(d[yVar]))
      .radius(6)
      .extent([[margin.left, margin.top], [svgWidth - margin.right, svgHeight - margin.bottom]]);

    const bins = hexbin(data);
    const hexGroup = svg.append("g").attr("class", "hexagons");

    // helper to compute hex fill safely
    const computeFill = d => {
      if (currentColorVar === "compromise") {
        return color(distance(d[0]));
      } else {
        const v = +d[0][currentColorVar];
        // if NaN fallback to domain midpoint
        if (!isFinite(v)) {
          const dom = color.domain();
          const mid = (d3.min(dom) + d3.max(dom)) / 2;
          return color(mid);
        }
        return color(v);
      }
    };

    // key by rounded position so enter/update/exit treats hex at same spot as same element
    const keyFn = d => `${Math.round(d.x)}-${Math.round(d.y)}`;

    const paths = hexGroup.selectAll("path").data(bins, keyFn);

    // exit
    paths.exit()
      .transition()
      .duration(150)
      .attr("opacity", 0)
      .remove();

    // enter
    const enter = paths.enter()
      .append("path")
      .attr("d", hexbin.hexagon())
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("stroke", d => importantSeeds.has(String(d[0].seed)) ? "#ff9800" : "#ffffff")
      .attr("stroke-width", d => importantSeeds.has(String(d[0].seed)) ? 2 : 0.2)
      .attr("fill-opacity", d => importantSeeds.has(String(d[0].seed)) ? 1.0 : 0.85)
      .attr("fill", d => computeFill(d))
      .attr("opacity", 0)
      .on("mouseover", function(event, bin) {
        const d = bin[0];
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 1.6);
        tooltip.classed("hidden", false).html(`
          <strong>Seed:</strong> ${d.seed}<br/>
          <strong>${currentX}:</strong> ${d[currentX] != null ? d[currentX].toFixed(3) : "—"}<br/>
          <strong>Gross Margin:</strong> €${d.total_gros_margin?.toLocaleString()}<br/>
          <hr style="border-top: 2px solid #fad2f0;">
          <strong>Edge (m):</strong> ${d.edge_out}<br/>
          <strong>Forest Cover:</strong> ${d.forest_cover?.toFixed(1)}%<br/>
          <strong>Grassland Cover:</strong> ${d.grassland_cover?.toFixed(1)}%<br/>
          <strong>Mean Field Area:</strong> ${d.area_mean?.toFixed(2)} ha
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
        infoBox.html(tooltip.html());
      })
      .on("mouseout", function() {
        // reset stroke to highlight or default
        const d = d3.select(this).datum();
        const isImportant = importantSeeds.has(String(d[0].seed));
        d3.select(this)
          .attr("stroke", isImportant ? "#ff9800" : "#ffffff")
          .attr("stroke-width", isImportant ? 2 : 0.2);
        tooltip.classed("hidden", true);
      });

    // staggered ripple entrance: use distance from center to get natural ripple + small index jitter
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    enter.transition()
      .delay((d, i) => {
        const dx = d.x - centerX;
        const dy = d.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // smaller multiplier for faster overall entrance
        return Math.round(dist * 0.6) + (i % 10) * 3;
      })
      .duration(250)
      .attr("opacity", 1);

    // update (existing hexes)
    paths.transition()
      .duration(300)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("fill", d => computeFill(d))
      .attr("fill-opacity", d => importantSeeds.has(String(d[0].seed)) ? 1.0 : 0.85)
      .attr("stroke", d => importantSeeds.has(String(d[0].seed)) ? "#ff9800" : "#ffffff")
      .attr("stroke-width", d => importantSeeds.has(String(d[0].seed)) ? 2 : 0.2)
      .attr("opacity", 1);

    // Legend (rebuild)
    svg.selectAll(".color-legend").remove();
    const legendGroup = svg.append("g")
      .attr("class", "color-legend")
      .attr("transform", `translate(${svgWidth - 120}, ${margin.top})`);

    const legendHeight = 100;
    const legendWidth = 10;

    const legendDomainMin = d3.min(color.domain());
    const legendDomainMax = d3.max(color.domain());
    const legendScale = d3.scaleLinear().domain([legendDomainMin, legendDomainMax]).range([legendHeight, 0]);
    const legendAxis = d3.axisRight(legendScale).ticks(4);

    // gradient
    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
    defs.select("#legend-gradient").remove();
    const defsGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("y1", "100%")
      .attr("x2", "0%").attr("y2", "0%");

    const stops = d3.range(0, 1.001, 0.1);
    defsGradient.selectAll("stop")
      .data(stops)
      .join("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", t => {
        const v = legendDomainMin + t * (legendDomainMax - legendDomainMin);
        return color(v);
      });

    legendGroup.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legendGroup.append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis);

    legendGroup.append("text")
      .attr("x", -5)
      .attr("y", -6)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("fill", "#444")
      .text(() => {
        const labelMap = {
          compromise: "Compromise Center",
          extra_profit: "Extra Profit",
          area_mean: "Mean Field Area",
          edge_out: "Edge Width",
          grassland_cover: "Grassland Cover",
          forest_cover: "Forest Cover"
        };
        return labelMap[currentColorVar] || currentColorVar;
      });

  } // renderChart end

  // initial render
  renderChart(currentX);

  // listeners
  document.getElementById("x-select").addEventListener("change", e => {
    currentX = e.target.value;
    renderChart(currentX);
  });

  document.getElementById("color-select").addEventListener("change", e => {
    currentColorVar = e.target.value;
    renderChart(currentX);
  });

}); // d3.csv.then end
